import { DateTime } from 'luxon';
import type { Appointment, Slot, User, WorkingHours } from '@medtime/shared';
import { CLINIC_TIMEZONE } from '@medtime/shared';
import { UserRepository } from '../repositories/user.repository.js';
import { DoctorRepository } from '../repositories/doctor.repository.js';
import { AppointmentRepository } from '../repositories/appointment.repository.js';
import { AvailabilityRepository } from '../repositories/availability.repository.js';
import { appointmentDto } from '../mappers/dto.js';
import { assert } from './errors.js';
import { ScheduleLock } from './lock.service.js';
import { EventBus } from './events.service.js';
export function generateSlots(date: string, hours: WorkingHours[], minutes: number): Slot[] {
  const day = DateTime.fromISO(date, { zone: CLINIC_TIMEZONE });
  const weekday = day.weekday % 7;
  return hours
    .filter((h) => h.dayOfWeek === weekday)
    .flatMap((h) => {
      let cursor = DateTime.fromISO(`${date}T${h.start}`, { zone: CLINIC_TIMEZONE });
      const end = DateTime.fromISO(`${date}T${h.end}`, { zone: CLINIC_TIMEZONE });
      const slots: Slot[] = [];
      while (cursor.plus({ minutes }).toMillis() <= end.toMillis()) {
        slots.push({
          startAt: cursor.toUTC().toISO()!,
          endAt: cursor.plus({ minutes }).toUTC().toISO()!,
        });
        cursor = cursor.plus({ minutes });
      }
      return slots;
    })
    .sort((a, b) => a.startAt.localeCompare(b.startAt));
}
export class SchedulingService {
  constructor(
    private users: UserRepository,
    private doctors: DoctorRepository,
    private appointments: AppointmentRepository,
    private availability: AvailabilityRepository,
    private locks: ScheduleLock,
    private events: EventBus,
  ) {}
  async available(doctorId: string, date: string): Promise<Slot[]> {
    const d = await this.doctors.getById(doctorId);
    const a = await this.availability.getByDoctorId(doctorId);
    const u = await this.users.getById(String(d.userId));
    assert(d.active && u.active, 404, 'NOT_FOUND', 'הרופא אינו פעיל');
    const day = DateTime.fromISO(date, { zone: CLINIC_TIMEZONE });
    const now = DateTime.now().setZone(CLINIC_TIMEZONE);
    assert(day.isValid, 400, 'INVALID_DATE', 'תאריך לא תקין');
    if (day.toMillis() < now.startOf('day').toMillis()) return [];
    assert(
      day.toMillis() <= now.plus({ days: 90 }).endOf('day').toMillis(),
      400,
      'DATE_RANGE',
      'ניתן לקבוע תור עד 90 יום קדימה',
    );
    const occupied = await this.appointments.overlapping(
      doctorId,
      day.toJSDate(),
      day.plus({ days: 1 }).toJSDate(),
    );
    return generateSlots(date, a.workingHours, a.slotMinutes).filter(
      (s) =>
        new Date(s.startAt).getTime() > Date.now() &&
        !occupied.some((o) => o.startAt < new Date(s.endAt) && o.endAt > new Date(s.startAt)),
    );
  }
  async book(
    actor: User,
    input: { doctorId: string; startAt: string; patientId?: string; note?: string },
  ): Promise<Appointment> {
    assert(
      actor.role === 'patient' || actor.role === 'admin',
      403,
      'FORBIDDEN',
      'רק מטופל או מנהל יכולים לקבוע תור',
    );
    assert(
      !input.patientId || actor.role === 'admin',
      403,
      'FORBIDDEN',
      'אין הרשאה לקבוע למטופל אחר',
    );
    const patientId = actor.role === 'admin' ? input.patientId : actor.id;
    assert(patientId, 400, 'PATIENT_REQUIRED', 'יש לבחור מטופל');
    return this.locks
      .run(input.doctorId, async () => {
        const patient = await this.users.getById(patientId);
        assert(
          patient.role === 'patient' && patient.active,
          400,
          'INVALID_PATIENT',
          'יש לבחור מטופל פעיל',
        );
        const requested = DateTime.fromISO(input.startAt).setZone(CLINIC_TIMEZONE);
        const slots = await this.available(input.doctorId, requested.toISODate()!);
        const slot = slots.find((s) => new Date(s.startAt).getTime() === requested.toMillis());
        assert(slot, 409, 'SLOT_UNAVAILABLE', 'התור אינו פנוי. בחרו שעה אחרת.');
        const doctor = await this.doctors.getById(input.doctorId);
        const du = await this.users.getById(String(doctor.userId));
        const a = await this.appointments.create({
          doctorId: String(doctor._id),
          patientId: String(patient._id),
          doctorName: du.name,
          patientName: patient.name,
          specialty: doctor.specialty,
          startAt: new Date(slot.startAt),
          endAt: new Date(slot.endAt),
          note: input.note || '',
          status: 'scheduled',
        });
        return appointmentDto(a);
      })
      .then((result) => {
        this.events.publish();
        return result;
      });
  }
  async list(actor: User, from?: string, to?: string) {
    const start = from ? new Date(from) : DateTime.now().minus({ days: 7 }).toJSDate();
    const end = to ? new Date(to) : DateTime.now().plus({ days: 90 }).toJSDate();
    assert(
      start < end && end.getTime() - start.getTime() <= 366 * 86400000,
      400,
      'DATE_RANGE',
      'יש לבחור טווח של עד שנה',
    );
    const scope: { from: Date; to: Date; patientId?: string; doctorId?: string } = {
      from: start,
      to: end,
    };
    if (actor.role === 'patient') scope.patientId = actor.id;
    if (actor.role === 'doctor') {
      const doctor = await this.doctors.findByUserId(actor.id);
      assert(doctor, 404, 'NOT_FOUND', 'פרופיל הרופא לא נמצא');
      scope.doctorId = String(doctor._id);
    }
    const rows = await this.appointments.list(scope);
    return rows.map(appointmentDto);
  }
  async cancel(actor: User, id: string) {
    const initial = await this.appointments.getById(id);
    assert(
      actor.role === 'admin' ||
        (actor.role === 'patient' && String(initial.patientId) === actor.id),
      403,
      'FORBIDDEN',
      'אין הרשאה לביטול התור',
    );
    return this.locks
      .run(String(initial.doctorId), async () => {
        const a = await this.appointments.getById(id);
        assert(
          a.status === 'scheduled' && a.startAt.getTime() > Date.now(),
          409,
          'INVALID_TRANSITION',
          'ניתן לבטל רק תור עתידי שנקבע',
        );
        return appointmentDto(await this.appointments.cancel(id));
      })
      .then((result) => {
        this.events.publish();
        return result;
      });
  }
  async visit(
    actor: User,
    id: string,
    input: { status: 'completed' | 'no_show'; visitSummary?: string; prescription?: string },
  ) {
    const initial = await this.appointments.getById(id);
    const d = await this.doctors.getById(String(initial.doctorId));
    assert(
      actor.role === 'doctor' && String(d.userId) === actor.id,
      403,
      'FORBIDDEN',
      'רק הרופא המטפל רשאי לעדכן ביקור',
    );
    return this.locks
      .run(String(d._id), async () => {
        const a = await this.appointments.getById(id);
        assert(
          a.status === 'scheduled' && a.startAt.getTime() <= Date.now(),
          409,
          'INVALID_TRANSITION',
          'ניתן לעדכן רק ביקור שהחל ושטרם הושלם',
        );
        return appointmentDto(
          await this.appointments.recordVisit(id, {
            status: input.status,
            visitSummary: input.visitSummary || '',
            prescription: input.prescription || '',
          }),
        );
      })
      .then((result) => {
        this.events.publish();
        return result;
      });
  }
  async history(actor: User, patientId: string) {
    const p = await this.users.getById(patientId);
    assert(p.role === 'patient', 404, 'NOT_FOUND', 'המטופל לא נמצא');
    if (actor.role === 'patient')
      assert(actor.id === patientId, 403, 'FORBIDDEN', 'אין הרשאה לצפייה');
    if (actor.role === 'doctor') {
      const d = await this.doctors.findByUserId(actor.id);
      const relation =
        d && (await this.appointments.hasTreatmentRelationship(String(d._id), patientId));
      assert(relation, 403, 'FORBIDDEN', 'אין קשר טיפולי למטופל');
    }
    return (await this.appointments.completedHistory(patientId)).map(appointmentDto);
  }
}
