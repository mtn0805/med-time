import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { DateTime } from 'luxon';
import type { User } from '@medtime/shared';
import { CLINIC_TIMEZONE } from '@medtime/shared';
import { z } from 'zod';
import { userDto } from '../mappers/dto.js';
import { UserRepository } from '../repositories/user.repository.js';
import { DoctorRepository } from '../repositories/doctor.repository.js';
import { AppointmentRepository } from '../repositories/appointment.repository.js';
import { AvailabilityRepository } from '../repositories/availability.repository.js';
import { schemas } from '../middleware/validation.js';
import { DoctorService } from './doctor.service.js';
import { ScheduleLock } from './lock.service.js';
import { EventBus } from './events.service.js';
import { assert } from './errors.js';
import { generateSlots } from './scheduling.service.js';
/** Administrative workflows coordinate account, profile and calendar changes. */
export class AdminService {
  constructor(
    private userRepository: UserRepository,
    private doctorRepository: DoctorRepository,
    private availabilityRepository: AvailabilityRepository,
    private appointmentRepository: AppointmentRepository,
    private doctorService: DoctorService,
    private locks: ScheduleLock,
    private events: EventBus,
  ) {}
  async users(search?: string) {
    const users = await this.userRepository.list();
    return users
      .map(userDto)
      .filter(
        (user) =>
          !search || `${user.name} ${user.email}`.toLowerCase().includes(search.toLowerCase()),
      );
  }
  async createDoctor(input: z.infer<typeof schemas.doctor>) {
    const passwordHash = await bcrypt.hash(input.password, 12);
    return mongoose.connection.transaction(async () => {
      const user = await this.userRepository.create({
        name: input.name,
        email: input.email,
        phone: input.phone,
        passwordHash,
        role: 'doctor',
      });
      const doctor = await this.doctorRepository.create({
        userId: String(user._id),
        specialty: input.specialty,
        bio: input.bio,
      });
      await this.availabilityRepository.create({
        doctorId: String(doctor._id),
        slotMinutes: input.slotMinutes,
        workingHours: input.workingHours,
      });
      return this.doctorService.present(doctor);
    });
  }
  async updateDoctor(id: string, input: z.infer<typeof schemas.doctorUpdate>) {
    return this.locks
      .run(id, async () => {
        const doctor = await this.doctorRepository.getById(id);
        const availability = await this.availabilityRepository.getByDoctorId(id);
        if (input.slotMinutes !== undefined || input.workingHours !== undefined) {
          const appointments = await this.appointmentRepository.futureScheduled(id);
          for (const appointment of appointments) {
            const date = DateTime.fromJSDate(appointment.startAt, {
              zone: CLINIC_TIMEZONE,
            }).toISODate()!;
            const slots = generateSlots(
              date,
              input.workingHours ?? availability.workingHours,
              input.slotMinutes ?? availability.slotMinutes,
            );
            assert(
              slots.some(
                (slot) =>
                  new Date(slot.startAt).getTime() === appointment.startAt.getTime() &&
                  new Date(slot.endAt).getTime() === appointment.endAt.getTime(),
              ),
              409,
              'SCHEDULE_CONFLICT',
              'שעות הפעילות החדשות מתנגשות בתורים עתידיים. יש לבטל או להעביר אותם תחילה.',
            );
          }
          await this.availabilityRepository.update(id, {
            slotMinutes: input.slotMinutes ?? availability.slotMinutes,
            workingHours: input.workingHours ?? availability.workingHours,
          });
        }
        const patch: { specialty?: string; bio?: string; active?: boolean } = {};
        if (input.specialty !== undefined) patch.specialty = input.specialty;
        if (input.bio !== undefined) patch.bio = input.bio;
        if (input.active !== undefined) patch.active = input.active;
        const updated = await this.doctorRepository.update(id, patch);
        if (input.active !== undefined)
          await this.userRepository.update(String(doctor.userId), { active: input.active });
        return this.doctorService.present(updated);
      })
      .then((result) => {
        this.events.publish();
        return result;
      });
  }
  async updateUser(_actor: User, id: string, input: z.infer<typeof schemas.userUpdate>) {
    const user = await this.userRepository.getById(id);
    assert(
      !(user.role === 'admin' && input.active === false),
      409,
      'ADMIN_PROTECTED',
      'לא ניתן להשבית חשבון מנהל',
    );
    if (user.role === 'doctor' && input.active !== undefined) {
      const doctor = await this.doctorRepository.findByUserId(id);
      if (doctor) await this.updateDoctor(String(doctor._id), { active: input.active });
    }
    return userDto(await this.userRepository.update(id, input));
  }
}
