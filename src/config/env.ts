import { config } from 'dotenv';
import { z } from 'zod';

// Load environment variables
config();

// Environment variable schema
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().default('3000'),
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string(),
  JWT_EXPIRES_IN: z.string().default('24h'),
});

// Parse and validate environment variables
const env = envSchema.parse(process.env);

export default env; 