import type { Request, Response } from 'express';
import { z } from 'zod';
import { userDto } from '../mappers/dto.js';
import { schemas, id } from '../middleware/validation.js';
import { AdminService } from '../services/admin.service.js';
import { AuthService } from '../services/auth.service.js';

const textQuery = z.string().trim().max(100).optional();

export class AdminController {
  constructor(
    private admin: AdminService,
    private auth: AuthService,
  ) {}

  users = async (req: Request, res: Response) => {
    res.json({ data: await this.admin.users(textQuery.parse(req.query.search)) });
  };

  createPatient = async (req: Request, res: Response) => {
    const patient = await this.auth.createPatient(schemas.register.parse(req.body));
    res.status(201).json({ data: userDto(patient) });
  };

  createDoctor = async (req: Request, res: Response) => {
    res
      .status(201)
      .json({ data: await this.admin.createDoctor(schemas.doctor.strict().parse(req.body)) });
  };

  updateDoctor = async (req: Request, res: Response) => {
    res.json({
      data: await this.admin.updateDoctor(
        id.parse(req.params.id),
        schemas.doctorUpdate.parse(req.body),
      ),
    });
  };

  updateUser = async (req: Request, res: Response) => {
    res.json({
      data: await this.admin.updateUser(
        req.user!,
        id.parse(req.params.id),
        schemas.userUpdate.parse(req.body),
      ),
    });
  };
}
