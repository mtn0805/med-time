import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
dotenv.config({
  path: fileURLToPath(new URL('../../.env', import.meta.url)),
  quiet: true,
} as dotenv.DotenvConfigOptions);
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  MONGODB_URI: z.string().min(1).default('mongodb://127.0.0.1:27017/medtime?replicaSet=rs0'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must contain at least 32 characters'),
  CLIENT_ORIGIN: z.string().url().default('http://localhost:5173'),
});
export const config = schema.parse(process.env);
if (
  config.NODE_ENV === 'production' &&
  /replace-with|example|demo|changeme/i.test(config.JWT_SECRET)
)
  throw new Error('Production JWT_SECRET must be an unpredictable secret');
