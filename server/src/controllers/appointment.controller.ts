import type { Request, Response } from 'express';
import { schemas, id, iso } from '../middleware/validation.js';
import { SchedulingService } from '../services/scheduling.service.js';

export class AppointmentController {
  constructor(private scheduling: SchedulingService) {}

  appointments = async (req: Request, res: Response) => {
    res.json({
      data: await this.scheduling.list(
        req.user!,
        iso.optional().parse(req.query.from),
        iso.optional().parse(req.query.to),
      ),
    });
  };

  book = async (req: Request, res: Response) => {
    res.status(201).json({
      data: await this.scheduling.book(req.user!, schemas.booking.parse(req.body)),
    });
  };

  cancel = async (req: Request, res: Response) => {
    res.json({ data: await this.scheduling.cancel(req.user!, id.parse(req.params.id)) });
  };

  visit = async (req: Request, res: Response) => {
    res.json({
      data: await this.scheduling.visit(
        req.user!,
        id.parse(req.params.id),
        schemas.visit.parse(req.body),
      ),
    });
  };

  history = async (req: Request, res: Response) => {
    res.json({ data: await this.scheduling.history(req.user!, id.parse(req.params.id)) });
  };
}
