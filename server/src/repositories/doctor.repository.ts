import { DoctorModel } from '../models/index.js';
import { assert } from '../services/errors.js';
export class DoctorRepository {
  async getById(id: string) {
    const doctor = await DoctorModel.findById(id);
    assert(doctor, 404, 'NOT_FOUND', 'הרופא לא נמצא');
    return doctor;
  }
  async findByUserId(userId: string) {
    return DoctorModel.findOne({ userId });
  }
  async list(specialty?: string, includeInactive = false) {
    return DoctorModel.find({
      ...(!includeInactive ? { active: true } : {}),
      ...(specialty ? { specialty } : {}),
    })
      .sort(includeInactive ? { _id: 1 } : { specialty: 1, _id: 1 })
      .limit(200);
  }
  async create(input: { userId: string; specialty: string; bio: string }) {
    return DoctorModel.create(input);
  }
  async update(id: string, patch: { specialty?: string; bio?: string; active?: boolean }) {
    const doctor = await DoctorModel.findByIdAndUpdate(
      id,
      { $set: patch },
      { new: true, runValidators: true },
    );
    assert(doctor, 404, 'NOT_FOUND', 'הרופא לא נמצא');
    return doctor;
  }
}
