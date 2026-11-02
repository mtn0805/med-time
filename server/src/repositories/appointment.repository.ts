import { AppointmentModel } from '../models/index.js';
import { assert } from '../services/errors.js';
export interface CreateAppointment {
  doctorId: string;
  patientId: string;
  doctorName: string;
  patientName: string;
  specialty: string;
  startAt: Date;
  endAt: Date;
  note: string;
  status: 'scheduled';
}
/** All selectors are constructed here from validated scalar arguments. */
export class AppointmentRepository {
  async getById(id: string) {
    const appointment = await AppointmentModel.findById(id);
    assert(appointment, 404, 'NOT_FOUND', 'התור לא נמצא');
    return appointment;
  }
  async create(input: CreateAppointment) {
    return AppointmentModel.create(input);
  }
  async overlapping(doctorId: string, from: Date, to: Date) {
    return AppointmentModel.find({
      doctorId,
      status: { $ne: 'cancelled' },
      startAt: { $lt: to },
      endAt: { $gt: from },
    })
      .setOptions({ sanitizeFilter: false })
      .maxTimeMS(5000);
  }
  async list(scope: { from: Date; to: Date; patientId?: string; doctorId?: string }) {
    return AppointmentModel.find({
      startAt: { $gte: scope.from, $lt: scope.to },
      ...(scope.patientId ? { patientId: scope.patientId } : {}),
      ...(scope.doctorId ? { doctorId: scope.doctorId } : {}),
    })
      .setOptions({ sanitizeFilter: false })
      .sort({ startAt: 1 })
      .limit(1000);
  }
  async futureScheduled(doctorId: string) {
    return AppointmentModel.find({
      doctorId,
      status: 'scheduled',
      startAt: { $gt: new Date() },
    }).setOptions({ sanitizeFilter: false });
  }
  async hasTreatmentRelationship(doctorId: string, patientId: string) {
    return Boolean(
      await AppointmentModel.exists({
        doctorId,
        patientId,
        status: { $ne: 'cancelled' },
      }).setOptions({ sanitizeFilter: false }),
    );
  }
  async completedHistory(patientId: string) {
    return AppointmentModel.find({ patientId, status: 'completed' })
      .sort({ startAt: -1 })
      .limit(500);
  }
  async cancel(id: string) {
    const appointment = await AppointmentModel.findByIdAndUpdate(
      id,
      { $set: { status: 'cancelled' } },
      { new: true, runValidators: true },
    );
    assert(appointment, 404, 'NOT_FOUND', 'התור לא נמצא');
    return appointment;
  }
  async recordVisit(
    id: string,
    input: { status: 'completed' | 'no_show'; visitSummary: string; prescription: string },
  ) {
    const appointment = await AppointmentModel.findByIdAndUpdate(
      id,
      { $set: input },
      { new: true, runValidators: true },
    );
    assert(appointment, 404, 'NOT_FOUND', 'התור לא נמצא');
    return appointment;
  }
}
