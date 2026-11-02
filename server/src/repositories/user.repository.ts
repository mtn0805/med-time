import type { Role } from '@medtime/shared';
import { PatientModel, UserModel } from '../models/index.js';
import { assert } from '../services/errors.js';
export interface CreateUser {
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  role: Role;
}
export class UserRepository {
  async findById(id: string) {
    return UserModel.findById(id);
  }
  async getById(id: string) {
    const user = await this.findById(id);
    assert(user, 404, 'NOT_FOUND', 'המשתמש לא נמצא');
    return user;
  }
  async findByEmailWithPassword(email: string) {
    return UserModel.findOne({ email }).select('+passwordHash');
  }
  async list() {
    return UserModel.find().sort({ name: 1 }).limit(1000);
  }
  async create(input: CreateUser) {
    return UserModel.create(input);
  }
  async createPatientProfile(userId: string) {
    return PatientModel.create({ userId });
  }
  async update(id: string, patch: { name?: string; phone?: string; active?: boolean }) {
    const user = await UserModel.findByIdAndUpdate(
      id,
      { $set: patch },
      { new: true, runValidators: true },
    );
    assert(user, 404, 'NOT_FOUND', 'המשתמש לא נמצא');
    return user;
  }
}
