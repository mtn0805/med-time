import type { User } from '@medtime/shared';
import { feedbackDto } from '../mappers/dto.js';
import { FeedbackRepository } from '../repositories/feedback.repository.js';
export class FeedbackService {
  constructor(private feedback: FeedbackRepository) {}
  async submit(actor: User, input: { category: 'suggestion' | 'issue'; message: string }) {
    const feedback = await this.feedback.create({
      ...input,
      userId: actor.id,
      userName: actor.name,
    });
    return feedbackDto(feedback);
  }
  async list() {
    return (await this.feedback.list()).map(feedbackDto);
  }
}
