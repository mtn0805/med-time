import mongoose from 'mongoose';
import { createApp } from './app.js';
import { connectDatabase } from './config/database.js';
import { config } from './config/env.js';
try {
  await connectDatabase();
  const server = createApp().listen(config.PORT, '0.0.0.0', () =>
    console.log(`MedTime API listening on port ${config.PORT}`),
  );
  const shutdown = () => {
    server.close(() => {
      void mongoose.disconnect().then(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
} catch (error) {
  console.error(
    'MedTime startup failed:',
    error instanceof Error ? error.message : 'Unknown failure',
  );
  process.exitCode = 1;
}
