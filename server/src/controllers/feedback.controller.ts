import type { Request, Response } from 'express';
import { schemas } from '../middleware/validation.js';
import { FeedbackService } from '../services/feedback.service.js';

export class FeedbackController {
  constructor(private feedbackService: FeedbackService) {}

  feedback = async (req: Request, res: Response) => {
    res.status(201).json({
      data: await this.feedbackService.submit(req.user!, schemas.feedback.parse(req.body)),
    });
  };

  feedbackList = async (_req: Request, res: Response) => {
    res.json({ data: await this.feedbackService.list() });
  };
}
