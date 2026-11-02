import mongoose from 'mongoose';
import { config } from './env.js';
import * as models from '../models/index.js';
export async function connectDatabase(uri = config.MONGODB_URI): Promise<void> {
  mongoose.set('strictQuery', true);
  mongoose.set('transactionAsyncLocalStorage', true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000, maxPoolSize: 20 });
  const topology = await mongoose.connection.db!.admin().command({ hello: 1 });
  if (!topology.setName && topology.msg !== 'isdbgrid') {
    await mongoose.disconnect();
    throw new Error(
      'MongoDB must run as a replica set (rs0 in local development) or sharded cluster for atomic scheduling',
    );
  }
  // Readiness requires indexes; races must not depend on background index creation.
  await Promise.all(
    Object.values(models)
      .filter((m) => typeof m === 'function' && 'init' in m)
      .map((m) => m.init()),
  );
}
