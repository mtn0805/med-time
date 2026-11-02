import mongoose, { Schema } from 'mongoose';
const options = { timestamps: true, strict: 'throw', versionKey: false } as const;
const user = new Schema(
  {
    name: { type: String, required: true, maxlength: 100 },
    email: { type: String, required: true, lowercase: true, unique: true },
    phone: { type: String, required: true, maxlength: 30 },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['patient', 'doctor', 'admin'], required: true },
    active: { type: Boolean, default: true },
  },
  options,
);
const patient = new Schema(
  { userId: { type: Schema.Types.ObjectId, ref: 'User', unique: true, required: true } },
  options,
);
const doctor = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', unique: true, required: true },
    specialty: { type: String, required: true, maxlength: 100 },
    bio: { type: String, default: '', maxlength: 2000 },
    active: { type: Boolean, default: true },
  },
  options,
);
const hours = new Schema(
  {
    dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
    start: { type: String, required: true },
    end: { type: String, required: true },
  },
  { _id: false, strict: 'throw' },
);
const availability = new Schema(
  {
    doctorId: { type: Schema.Types.ObjectId, ref: 'Doctor', unique: true, required: true },
    slotMinutes: { type: Number, default: 20 },
    workingHours: { type: [hours], default: [] },
  },
  options,
);
const appointment = new Schema(
  {
    doctorId: { type: Schema.Types.ObjectId, ref: 'Doctor', required: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    doctorName: { type: String, required: true },
    patientName: { type: String, required: true },
    specialty: { type: String, required: true },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled', 'no_show'],
      default: 'scheduled',
      required: true,
    },
    note: { type: String, maxlength: 2000, default: '' },
    visitSummary: { type: String, maxlength: 10000, default: '' },
    prescription: { type: String, maxlength: 5000, default: '' },
  },
  options,
);
appointment.index(
  { doctorId: 1, startAt: 1 },
  { unique: true, partialFilterExpression: { status: 'scheduled' } },
);
appointment.index({ doctorId: 1, startAt: 1, endAt: 1 });
appointment.index({ patientId: 1, startAt: 1 });
const feedback = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, required: true },
    category: { type: String, enum: ['suggestion', 'issue'], required: true },
    message: { type: String, required: true, maxlength: 5000 },
  },
  options,
);
const lock = new Schema(
  { _id: { type: String, required: true }, revision: { type: Number, required: true, default: 0 } },
  { versionKey: false },
);
export const UserModel = mongoose.model('User', user);
export const PatientModel = mongoose.model('Patient', patient);
export const DoctorModel = mongoose.model('Doctor', doctor);
export const AvailabilityModel = mongoose.model('Availability', availability);
export const AppointmentModel = mongoose.model('Appointment', appointment);
export const FeedbackModel = mongoose.model('Feedback', feedback);
export const LockModel = mongoose.model('ScheduleLock', lock);
