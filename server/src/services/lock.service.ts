import mongoose from 'mongoose';
import { LockModel } from '../models/index.js';
/**
 * Transactional per-doctor guard (pessimistic serialization using Mongo write
 * conflicts). All schedule writers touch the same document before reading slots.
 * A competing transaction retries on a fresh snapshot; there is no lease that can
 * expire while a process is paused. Mongoose AsyncLocalStorage propagates the
 * session through injected services/repositories, avoiding accidental bare writes.
 */
export class ScheduleLock {
  async run<T>(doctorId: string, operation: () => Promise<T>): Promise<T> {
    try {
      await LockModel.updateOne(
        { _id: doctorId },
        { $setOnInsert: { revision: 0 } },
        { upsert: true },
      );
    } catch (error) {
      if ((error as { code?: number }).code !== 11000) throw error;
    }
    return mongoose.connection.transaction(
      async () => {
        await LockModel.updateOne(
          { _id: doctorId },
          { $inc: { revision: 1 } },
          { maxTimeMS: 5000 },
        );
        return operation();
      },
      {
        readConcern: { level: 'snapshot' },
        writeConcern: { w: 'majority' },
        maxCommitTimeMS: 5000,
      },
    );
  }
}
