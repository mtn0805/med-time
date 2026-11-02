import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import type { Express } from 'express';
import type { Doctor, Slot, User } from '@medtime/shared';

// These tests use a real MongoDB database, including its unique indexes and
// atomic updates. Never substitute in-memory maps for the booking race test.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'integration-tests-only-secret-at-least-32-characters';
process.env.CLIENT_ORIGIN = 'http://localhost:5173';

const testUri =
  process.env.TEST_MONGODB_URI ?? 'mongodb://127.0.0.1:27017/medtime_test?replicaSet=rs0';
const password = 'StrongTestPassword42!';
const week = Array.from({ length: 7 }, (_, dayOfWeek) => ({
  dayOfWeek,
  start: '08:00',
  end: '17:00',
}));
type Agent = ReturnType<typeof request.agent>;

let app: Express;
let admin: Agent;
let patient: Agent;
let doctorAgent: Agent;
let administrator: User;
let patientUser: User;
let doctor: Doctor;
let models: typeof import('../src/models/index.js');
let passwordHash: string;

function clinicDate(daysFromNow: number): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(Date.now() + daysFromNow * 86_400_000));
}

async function availableSlots(): Promise<Slot[]> {
  const response = await request(app)
    .get(`/api/doctors/${doctor.id}/availability`)
    .query({ date: clinicDate(2) });
  expect(response.status).toBe(200);
  expect(response.body.data.length).toBeGreaterThan(0);
  return response.body.data;
}

async function register(email = 'new.patient@example.test'): Promise<{ agent: Agent; user: User }> {
  const agent = request.agent(app);
  const response = await agent
    .post('/api/auth/register')
    .send({ name: 'מטופל בדיקה', email, phone: '0501234567', password });
  expect(response.status).toBe(201);
  return { agent, user: response.body.data };
}

describe.sequential('MedTime API against MongoDB', () => {
  beforeAll(async () => {
    // Refuse destructive cleanup unless both URI and connected database name
    // identify a test database. URI matching also works with authentication.
    const pathname = new URL(testUri).pathname.replace(/^\//, '');
    if (!pathname.endsWith('_test'))
      throw new Error('TEST_MONGODB_URI database must end with _test');
    const { connectDatabase } = await import('../src/config/database.js');
    await connectDatabase(testUri);
    if (!mongoose.connection.db?.databaseName.endsWith('_test'))
      throw new Error('Refusing cleanup of a non-test database');
    models = await import('../src/models/index.js');
    const { createApp } = await import('../src/app.js');
    app = createApp();
    passwordHash = await bcrypt.hash(password, 12);
  }, 60_000);

  beforeEach(async () => {
    await Promise.all(
      Object.values(mongoose.connection.collections).map((collection) => collection.deleteMany({})),
    );
    const adminDoc = await models.UserModel.create({
      name: 'מנהל בדיקה',
      email: 'admin@example.test',
      phone: '0501111111',
      passwordHash,
      role: 'admin',
      active: true,
    });
    admin = request.agent(app);
    const login = await admin
      .post('/api/auth/login')
      .send({ email: 'admin@example.test', password, role: 'admin' });
    expect(login.status).toBe(200);
    administrator = { ...login.body.data, id: adminDoc.id };

    const registration = await register('patient@example.test');
    patient = registration.agent;
    patientUser = registration.user;

    const creation = await admin.post('/api/admin/doctors').send({
      name: 'ד״ר בדיקה',
      email: 'doctor@example.test',
      phone: '0502222222',
      password,
      specialty: 'רפואת משפחה',
      bio: 'רופא לצורכי בדיקות אינטגרציה',
      slotMinutes: 20,
      workingHours: week,
    });
    expect(creation.status).toBe(201);
    doctor = creation.body.data;
    doctorAgent = request.agent(app);
    const doctorLogin = await doctorAgent
      .post('/api/auth/login')
      .send({ email: doctor.email, password, role: 'doctor' });
    expect(doctorLogin.status).toBe(200);
  }, 30_000);

  afterAll(async () => {
    if (
      mongoose.connection.readyState === 1 &&
      mongoose.connection.db?.databaseName.endsWith('_test')
    ) {
      await Promise.all(
        Object.values(mongoose.connection.collections).map((collection) =>
          collection.deleteMany({}),
        ),
      );
    }
    await mongoose.disconnect();
  });

  it('persists bcrypt password hashes, uses HttpOnly cookies, and routes users by their actual role', async () => {
    const account = await models.UserModel.findOne({ email: patientUser.email }).select(
      '+passwordHash',
    );
    expect(account?.passwordHash).not.toBe(password);
    expect(await bcrypt.compare(password, account!.passwordHash)).toBe(true);
    const anonymous = request.agent(app);
    const wrongRole = await anonymous
      .post('/api/auth/login')
      .send({ email: patientUser.email, password, role: 'admin' });
    expect([401, 403]).toContain(wrongRole.status);
    const response = await anonymous
      .post('/api/auth/login')
      .send({ email: patientUser.email, password, role: 'patient' });
    expect(response.status).toBe(200);
    expect(response.body.data.role).toBe('patient');
    expect(response.body.data).not.toHaveProperty('passwordHash');
    expect(response.headers['set-cookie'].join(';')).toMatch(/HttpOnly/i);
    expect(response.headers['set-cookie'].join(';')).toMatch(/SameSite=(?:Strict|Lax)/i);
    expect((await anonymous.get('/api/auth/me')).body.data.id).toBe(patientUser.id);
    expect((await anonymous.post('/api/auth/logout')).status).toBe(200);
    expect((await anonymous.get('/api/auth/me')).status).toBe(401);
  });

  it('rejects role escalation, malformed login input, and unauthorized management', async () => {
    const escalation = await request(app).post('/api/auth/register').send({
      name: 'Bad role',
      email: 'bad@example.test',
      phone: '0501234567',
      password,
      role: 'admin',
    });
    expect([400, 422]).toContain(escalation.status);
    const injection = await request(app)
      .post('/api/auth/login')
      .send({ email: { $ne: null }, password, role: 'admin' });
    expect([400, 422]).toContain(injection.status);
    expect((await patient.get('/api/admin/users')).status).toBe(403);
    expect((await request(app).get('/api/admin/users')).status).toBe(401);
    const malformedId = await request(app)
      .get('/api/doctors/not-an-id/availability')
      .query({ date: clinicDate(2) });
    expect([400, 422]).toContain(malformedId.status);
  });

  it('rejects passwords exceeding bcrypt’s 72-byte limit even when their character count fits', async () => {
    const unicodePassword = 'א'.repeat(40); // 40 code points, 80 UTF-8 bytes.
    expect(Buffer.byteLength(unicodePassword, 'utf8')).toBeGreaterThan(72);
    const registration = await request(app).post('/api/auth/register').send({
      name: 'בדיקת אורך',
      email: 'long-password@example.test',
      phone: '0501234567',
      password: unicodePassword,
    });
    expect([400, 422]).toContain(registration.status);
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: patientUser.email, password: unicodePassword, role: 'patient' });
    expect([400, 422]).toContain(login.status);
  });

  it('lists doctors publicly, filters specialty and keeps account secrets out of responses', async () => {
    const response = await request(app).get('/api/doctors').query({ specialty: 'רפואת משפחה' });
    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toMatchObject({
      id: doctor.id,
      name: 'ד״ר בדיקה',
      slotMinutes: 20,
    });
    expect(JSON.stringify(response.body)).not.toMatch(/passwordHash|StrongTestPassword/);
    expect(
      (await request(app).get('/api/doctors').query({ specialty: 'לא קיימת' })).body.data,
    ).toEqual([]);
  });

  it('generates real twenty-minute clinic slots and excludes past dates and booked times', async () => {
    const past = await request(app)
      .get(`/api/doctors/${doctor.id}/availability`)
      .query({ date: clinicDate(-2) });
    expect(past.status).toBe(200);
    expect(past.body.data).toEqual([]);
    const slots = await availableSlots();
    expect(new Date(slots[0].endAt).getTime() - new Date(slots[0].startAt).getTime()).toBe(
      20 * 60_000,
    );
    const booked = await patient
      .post('/api/appointments')
      .send({ doctorId: doctor.id, startAt: slots[0].startAt, note: 'בדיקת זמינות' });
    expect(booked.status).toBe(201);
    expect(booked.body.data.patientId).toBe(patientUser.id);
    expect((await availableSlots()).some((slot) => slot.startAt === slots[0].startAt)).toBe(false);
    const persisted = await models.AppointmentModel.findById(booked.body.data.id);
    expect(persisted).not.toBeNull();
    expect(persisted!.status).toBe('scheduled');
    const offGrid = new Date(new Date(slots[1].startAt).getTime() + 60_000).toISOString();
    expect([400, 409, 422]).toContain(
      (await patient.post('/api/appointments').send({ doctorId: doctor.id, startAt: offGrid }))
        .status,
    );
  });

  it('allows exactly one concurrent booking for the same slot and persists one active appointment', async () => {
    const slot = (await availableSlots())[0];
    const otherA = await register('race-a@example.test');
    const otherB = await register('race-b@example.test');
    const agents = [patient, otherA.agent, otherB.agent, patient, otherA.agent, otherB.agent];
    const results = await Promise.all(
      agents.map((agent) =>
        agent.post('/api/appointments').send({ doctorId: doctor.id, startAt: slot.startAt }),
      ),
    );
    expect(results.filter((response) => response.status === 201)).toHaveLength(1);
    expect(results.filter((response) => response.status === 409)).toHaveLength(agents.length - 1);
    expect(
      await models.AppointmentModel.countDocuments({
        doctorId: doctor.id,
        startAt: new Date(slot.startAt),
        status: 'scheduled',
      }),
    ).toBe(1);
  }, 30_000);

  it('enforces appointment ownership and reopens a slot after cancellation', async () => {
    const slot = (await availableSlots())[0];
    const booked = await patient
      .post('/api/appointments')
      .send({ doctorId: doctor.id, startAt: slot.startAt });
    expect(booked.status).toBe(201);
    const stranger = await register('stranger@example.test');
    expect([403, 404]).toContain(
      (await stranger.agent.patch(`/api/appointments/${booked.body.data.id}/cancel`)).status,
    );
    const strangersAppointments = await stranger.agent.get('/api/appointments');
    expect(strangersAppointments.status).toBe(200);
    expect(strangersAppointments.body.data).toEqual([]);
    const cancelled = await patient.patch(`/api/appointments/${booked.body.data.id}/cancel`);
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.data.status).toBe('cancelled');
    expect((await availableSlots()).some((candidate) => candidate.startAt === slot.startAt)).toBe(
      true,
    );
    expect(
      (
        await stranger.agent
          .post('/api/appointments')
          .send({ doctorId: doctor.id, startAt: slot.startAt })
      ).status,
    ).toBe(201);
  });

  it('prevents patient impersonation while allowing an admin to create patients and book for them', async () => {
    const slot = (await availableSlots())[0];
    const forged = await patient
      .post('/api/appointments')
      .send({ doctorId: doctor.id, startAt: slot.startAt, patientId: administrator.id });
    expect([400, 403, 422]).toContain(forged.status);
    const creation = await admin
      .post('/api/admin/patients')
      .send({ name: 'מטופל מנהלה', email: 'managed@example.test', phone: '0508888888', password });
    expect(creation.status).toBe(201);
    const booked = await admin
      .post('/api/appointments')
      .send({ doctorId: doctor.id, startAt: slot.startAt, patientId: creation.body.data.id });
    expect(booked.status).toBe(201);
    expect(booked.body.data.patientId).toBe(creation.body.data.id);
  });

  it('refuses schedule changes that would invalidate an existing future booking', async () => {
    const slot = (await availableSlots())[0];
    expect(
      (await patient.post('/api/appointments').send({ doctorId: doctor.id, startAt: slot.startAt }))
        .status,
    ).toBe(201);
    const changed = await admin
      .patch(`/api/admin/doctors/${doctor.id}`)
      .send({ workingHours: week.map((hours) => ({ ...hours, start: '10:00' })) });
    expect(changed.status).toBe(409);
    const doctors = await request(app).get('/api/doctors');
    expect(doctors.body.data[0].workingHours).toEqual(week);
  });

  it('serializes a simultaneous booking and schedule change without leaving an off-schedule appointment', async () => {
    const slot = (await availableSlots())[0];
    const changedHours = week.map((hours) => ({ ...hours, start: '10:00' }));
    const [booking, change] = await Promise.all([
      patient.post('/api/appointments').send({ doctorId: doctor.id, startAt: slot.startAt }),
      admin.patch(`/api/admin/doctors/${doctor.id}`).send({ workingHours: changedHours }),
    ]);
    // Either operation may win, but accepting both would leave a booking that
    // contradicts the doctor's persisted reception hours.
    expect([
      [201, 409],
      [409, 200],
    ]).toContainEqual([booking.status, change.status]);
    const persisted = await models.AppointmentModel.find({
      doctorId: doctor.id,
      status: 'scheduled',
    });
    const response = await request(app).get('/api/doctors');
    const persistedDoctor: Doctor = response.body.data.find(
      (candidate: Doctor) => candidate.id === doctor.id,
    );
    if (booking.status === 201) {
      expect(persisted).toHaveLength(1);
      expect(persistedDoctor.workingHours).toEqual(week);
    } else {
      expect(persisted).toHaveLength(0);
      expect(persistedDoctor.workingHours).toEqual(changedHours);
    }
  });

  it('restricts medical history to the patient, admin and a legitimately assigned doctor', async () => {
    const unrelated = await register('unrelated@example.test');
    expect([403, 404]).toContain(
      (await unrelated.agent.get(`/api/patients/${patientUser.id}/history`)).status,
    );
    expect([403, 404]).toContain(
      (await doctorAgent.get(`/api/patients/${patientUser.id}/history`)).status,
    );

    const startAt = new Date(Date.now() - 86_400_000);
    const visit = await models.AppointmentModel.create({
      doctorId: doctor.id,
      patientId: patientUser.id,
      doctorName: doctor.name,
      patientName: patientUser.name,
      specialty: doctor.specialty,
      startAt,
      endAt: new Date(startAt.getTime() + 20 * 60_000),
      status: 'scheduled',
    });
    const completed = await doctorAgent.patch(`/api/appointments/${visit.id}/visit`).send({
      status: 'completed',
      visitSummary: 'הבדיקה הושלמה',
      prescription: 'הנחיות טקסט פנימיות לבדיקה',
    });
    expect(completed.status).toBe(200);
    expect(completed.body.data).toMatchObject({
      status: 'completed',
      visitSummary: 'הבדיקה הושלמה',
    });
    const ownHistory = await patient.get(`/api/patients/${patientUser.id}/history`);
    expect(ownHistory.status).toBe(200);
    expect(ownHistory.body.data).toHaveLength(1);
    expect(ownHistory.body.data[0].visitSummary).toBe('הבדיקה הושלמה');
    expect((await doctorAgent.get(`/api/patients/${patientUser.id}/history`)).status).toBe(200);
    expect([403, 404]).toContain(
      (await patient.patch(`/api/appointments/${visit.id}/visit`).send({ status: 'no_show' }))
        .status,
    );
  });

  it('stores authenticated feedback for administrators and rejects anonymous submissions', async () => {
    const payload = {
      category: 'suggestion',
      message: 'אשמח לאפשרויות חיפוש נוספות ברשימת הרופאים',
    };
    expect((await request(app).post('/api/feedback').send(payload)).status).toBe(401);
    const submitted = await patient.post('/api/feedback').send(payload);
    expect(submitted.status).toBe(201);
    expect(submitted.body.data).toMatchObject({
      userId: patientUser.id,
      category: 'suggestion',
      message: payload.message,
    });
    const inbox = await admin.get('/api/admin/feedback');
    expect(inbox.status).toBe(200);
    expect(inbox.body.data).toHaveLength(1);
    expect(inbox.body.data[0].message).toBe(payload.message);
    expect((await patient.get('/api/admin/feedback')).status).toBe(403);
  });

  it('updates personal data safely, revokes deactivated accounts and protects the current admin', async () => {
    const updated = await patient
      .patch('/api/auth/me')
      .send({ name: 'שם מעודכן', phone: '0509999999' });
    expect(updated.status).toBe(200);
    expect(updated.body.data.name).toBe('שם מעודכן');
    const roleChange = await patient.patch('/api/auth/me').send({ role: 'admin' });
    expect([400, 422]).toContain(roleChange.status);
    const deactivated = await admin
      .patch(`/api/admin/users/${patientUser.id}`)
      .send({ active: false });
    expect(deactivated.status).toBe(200);
    expect((await patient.get('/api/auth/me')).status).toBe(401);
    const selfDeactivate = await admin
      .patch(`/api/admin/users/${administrator.id}`)
      .send({ active: false });
    expect([400, 409, 422]).toContain(selfDeactivate.status);
  });

  it('checks database health and blocks cross-origin state changes', async () => {
    const health = await request(app).get('/api/health');
    expect(health.status).toBe(200);
    expect(health.body.data.status).toBe('ok');
    const csrf = await patient
      .patch('/api/auth/me')
      .set('Origin', 'https://untrusted.example')
      .send({ name: 'forged', phone: '0501234567' });
    expect(csrf.status).toBe(403);
  });
});
