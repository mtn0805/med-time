import type { WorkingHours } from '@medtime/shared';
import { AvailabilityModel } from '../models/index.js';
import { assert } from '../services/errors.js';
export class AvailabilityRepository {
  async getByDoctorId(doctorId: string) {
    const availability = await AvailabilityModel.findOne({ doctorId });
    assert(availability, 404, 'NOT_FOUND', 'שעות הפעילות לא נמצאו');
    return availability;
  }
  async create(input: { doctorId: string; slotMinutes: number; workingHours: WorkingHours[] }) {
    return AvailabilityModel.create(input);
  }
  async update(doctorId: string, patch: { slotMinutes: number; workingHours: WorkingHours[] }) {
    const availability = await AvailabilityModel.findOneAndUpdate(
      { doctorId },
      { $set: patch },
      { new: true, runValidators: true },
    );
    assert(availability, 404, 'NOT_FOUND', 'שעות הפעילות לא נמצאו');
    return availability;
  }
}
