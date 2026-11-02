import type { Types, InferSchemaType } from 'mongoose';
import type { User, Doctor, Appointment, Feedback } from '@medtime/shared';
import type {
  UserModel,
  DoctorModel,
  AvailabilityModel,
  AppointmentModel,
  FeedbackModel,
} from '../models/index.js';
export type UserRecord = InferSchemaType<typeof UserModel.schema> & { _id: Types.ObjectId };
export type DoctorRecord = InferSchemaType<typeof DoctorModel.schema> & { _id: Types.ObjectId };
export type AvailabilityRecord = InferSchemaType<typeof AvailabilityModel.schema> & {
  _id: Types.ObjectId;
};
export type AppointmentRecord = InferSchemaType<typeof AppointmentModel.schema> & {
  _id: Types.ObjectId;
};
export type FeedbackRecord = InferSchemaType<typeof FeedbackModel.schema> & { _id: Types.ObjectId };
/** Explicit projections keep persistence details and password hashes out of API responses. */
export function userDto(user: UserRecord): User {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    active: user.active,
  };
}
export function doctorDto(
  doctor: DoctorRecord,
  user: UserRecord,
  availability: AvailabilityRecord,
): Doctor {
  return {
    id: String(doctor._id),
    userId: String(user._id),
    name: user.name,
    email: user.email,
    phone: user.phone,
    specialty: doctor.specialty,
    bio: doctor.bio,
    slotMinutes: availability.slotMinutes,
    workingHours: availability.workingHours.map((hours) => ({
      dayOfWeek: hours.dayOfWeek,
      start: hours.start,
      end: hours.end,
    })),
    active: doctor.active && user.active,
  };
}
export function appointmentDto(appointment: AppointmentRecord): Appointment {
  return {
    id: String(appointment._id),
    doctorId: String(appointment.doctorId),
    patientId: String(appointment.patientId),
    doctorName: appointment.doctorName,
    patientName: appointment.patientName,
    specialty: appointment.specialty,
    startAt: appointment.startAt.toISOString(),
    endAt: appointment.endAt.toISOString(),
    status: appointment.status,
    note: appointment.note,
    visitSummary: appointment.visitSummary,
    prescription: appointment.prescription,
  };
}
export function feedbackDto(feedback: FeedbackRecord): Feedback {
  return {
    id: String(feedback._id),
    userId: String(feedback.userId),
    userName: feedback.userName,
    category: feedback.category,
    message: feedback.message,
    createdAt: feedback.createdAt.toISOString(),
  };
}
