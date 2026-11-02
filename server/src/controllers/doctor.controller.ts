import type { Request, Response } from 'express';
import { z } from 'zod';
import { id, date } from '../middleware/validation.js';
import { AuthService } from '../services/auth.service.js';
import { DoctorService } from '../services/doctor.service.js';
import { SchedulingService } from '../services/scheduling.service.js';
import { assert } from '../services/errors.js';

const textQuery = z.string().trim().max(100).optional();

export class DoctorController {
  constructor(
    private auth: AuthService,
    private doctorService: DoctorService,
    private scheduling: SchedulingService,
  ) {}

  doctors = async (req: Request, res: Response) => {
    const search = textQuery.parse(req.query.search);
    const specialty = textQuery.parse(req.query.specialty);
    const includeInactive = req.query.includeInactive === 'true';
    if (includeInactive) {
      const actor = await this.auth.authenticate(req.cookies?.medtime_session);
      assert(actor.role === 'admin', 403, 'FORBIDDEN', 'אין הרשאה לצפייה ברופאים לא פעילים');
    }
    res.json({ data: await this.doctorService.list(search, specialty, includeInactive) });
  };

  availability = async (req: Request, res: Response) => {
    res.json({
      data: await this.scheduling.available(id.parse(req.params.id), date.parse(req.query.date)),
    });
  };
}
