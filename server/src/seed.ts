import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { config } from './config/env.js';
import { connectDatabase } from './config/database.js';
import { UserModel } from './models/index.js';
import { AuthService } from './services/auth.service.js';
import { AdminService } from './services/admin.service.js';
import { UserRepository } from './repositories/user.repository.js';
import { DoctorRepository } from './repositories/doctor.repository.js';
import { AvailabilityRepository } from './repositories/availability.repository.js';
import { AppointmentRepository } from './repositories/appointment.repository.js';
import { DoctorService } from './services/doctor.service.js';
import { ScheduleLock } from './services/lock.service.js';
import { EventBus } from './services/events.service.js';
if (config.NODE_ENV === 'production') throw new Error('Demo seed is disabled in production');
await connectDatabase();
try {
  const password = 'MedTime2026!';
  if (!(await UserModel.exists({ email: 'admin@medtime.local' })))
    await UserModel.create({
      name: 'מנהלת המרפאה',
      email: 'admin@medtime.local',
      phone: '0501234567',
      passwordHash: await bcrypt.hash(password, 12),
      role: 'admin',
    });
  const users = new UserRepository(),
    doctorsRepository = new DoctorRepository(),
    availability = new AvailabilityRepository();
  const doctorService = new DoctorService(doctorsRepository, users, availability);
  const auth = new AuthService(users),
    admin = new AdminService(
      users,
      doctorsRepository,
      availability,
      new AppointmentRepository(),
      doctorService,
      new ScheduleLock(),
      new EventBus(),
    );
  if (!(await UserModel.exists({ email: 'patient@medtime.local' })))
    await auth.createPatient({
      name: 'נועה ישראלי',
      email: 'patient@medtime.local',
      phone: '0501112222',
      password,
    });
  const doctors = [
    {
      name: 'ד״ר יעל כהן',
      email: 'doctor@medtime.local',
      specialty: 'רפואת משפחה',
      bio: 'רופאת משפחה, מתמחה ברפואה מונעת ובליווי אישי לכל אורך הדרך.',
    },
    {
      name: 'ד״ר איתי לוי',
      email: 'itay@medtime.local',
      specialty: 'רפואת ילדים',
      bio: 'רפואת ילדים בגישה רגישה ומקצועית, מתינוקות ועד מתבגרים.',
    },
    {
      name: 'ד״ר מיכל רז',
      email: 'michal@medtime.local',
      specialty: 'רפואת עור',
      bio: 'אבחון וטיפול במחלות עור, עם תשומת לב לפרטים ולבריאות שלכם.',
    },
  ];
  for (const doctor of doctors)
    if (!(await UserModel.exists({ email: doctor.email })))
      await admin.createDoctor({
        ...doctor,
        phone: '0502223333',
        password,
        slotMinutes: 20,
        workingHours: [0, 1, 2, 3, 4].map((dayOfWeek) => ({
          dayOfWeek,
          start: '08:00',
          end: '17:00',
        })),
      });
  console.log(
    'Development demo users ready. See README for demo login credentials. Existing users were preserved.',
  );
} finally {
  await mongoose.disconnect();
}
