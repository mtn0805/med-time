import { FeedbackModel } from '../models/index.js';
export class FeedbackRepository {
  async create(input: {
    userId: string;
    userName: string;
    category: 'suggestion' | 'issue';
    message: string;
  }) {
    return FeedbackModel.create(input);
  }
  async list() {
    return FeedbackModel.find().sort({ createdAt: -1 }).limit(500);
  }
}
