export type Role = 'patient' | 'doctor' | 'admin';
export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show';
export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  active: boolean;
}
export interface WorkingHours {
  dayOfWeek: number;
  start: string;
  end: string;
}
export interface Doctor {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  specialty: string;
  bio: string;
  slotMinutes: number;
  workingHours: WorkingHours[];
  active: boolean;
}
export interface Slot {
  startAt: string;
  endAt: string;
}
export interface Appointment {
  id: string;
  doctorId: string;
  patientId: string;
  doctorName: string;
  patientName: string;
  specialty: string;
  startAt: string;
  endAt: string;
  status: AppointmentStatus;
  note?: string;
  visitSummary?: string;
  prescription?: string;
}
export interface Feedback {
  id: string;
  userId: string;
  userName: string;
  category: 'suggestion' | 'issue';
  message: string;
  createdAt: string;
}
export interface ApiResponse<T> {
  data: T;
}
export interface ApiError {
  error: { code: string; message: string; details?: unknown };
}
export const CLINIC_TIMEZONE = 'Asia/Jerusalem';
export const ROLE_LABELS: Record<Role, string> = {
  patient: 'מטופל',
  doctor: 'רופא',
  admin: 'מנהל מרפאה',
};
export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: 'נקבע',
  completed: 'הושלם',
  cancelled: 'בוטל',
  no_show: 'לא הגיע',
};
