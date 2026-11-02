import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import type { Role } from '@medtime/shared';
import { config } from '../config/env.js';
import { UserRepository } from '../repositories/user.repository.js';
import { AppError, assert } from './errors.js';
import { userDto, type UserRecord } from '../mappers/dto.js';
export class AuthService {
  constructor(private users: UserRepository) {}
  async createPatient(input: { name: string; email: string; phone: string; password: string }) {
    const passwordHash = await bcrypt.hash(input.password, 12);
    return mongoose.connection.transaction(async () => {
      const u = await this.users.create({
        name: input.name,
        email: input.email,
        phone: input.phone,
        passwordHash,
        role: 'patient',
      });
      await this.users.createPatientProfile(String(u._id));
      return u;
    });
  }
  async updateProfile(id: string, input: { name: string; phone: string }) {
    return userDto(await this.users.update(id, input));
  }
  async login(email: string, password: string, role: Role) {
    const u = await this.users.findByEmailWithPassword(email);
    const valid = u
      ? await bcrypt.compare(password, u.passwordHash)
      : await bcrypt.compare(
          password,
          '$2b$12$KgBg79OzSU45DgX58goqUeLmoTfOT3PXHLfx0SmLwCqPSsTZtyqsS',
        );
    assert(
      u && valid && u.active && u.role === role,
      401,
      'INVALID_CREDENTIALS',
      'פרטי ההתחברות או התפקיד אינם נכונים',
    );
    return u;
  }
  token(u: UserRecord) {
    return jwt.sign({ sub: String(u._id) }, config.JWT_SECRET, {
      expiresIn: '8h',
      issuer: 'medtime',
      audience: 'medtime-client',
    });
  }
  async authenticate(token: unknown) {
    assert(typeof token === 'string', 401, 'UNAUTHENTICATED', 'יש להתחבר למערכת');
    let id: string;
    try {
      const payload = jwt.verify(token, config.JWT_SECRET, {
        issuer: 'medtime',
        audience: 'medtime-client',
        algorithms: ['HS256'],
      });
      assert(
        typeof payload === 'object' && typeof payload.sub === 'string',
        401,
        'UNAUTHENTICATED',
        'יש להתחבר מחדש',
      );
      id = payload.sub;
    } catch {
      throw new AppError(401, 'UNAUTHENTICATED', 'יש להתחבר מחדש');
    }
    const u = await this.users.findById(id);
    assert(u && u.active, 401, 'UNAUTHENTICATED', 'החשבון אינו פעיל');
    return userDto(u);
  }
}
