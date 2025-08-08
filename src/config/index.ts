import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({
    path: process.env.NODE_ENV === 'production' ? '.env' : '.env.local'
});

// Environment variables schema
const envSchema = z.object({
  PORT: z.string().optional().default('3000').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  
  // Telegram configuration
  TELEGRAM_BOT_TOKEN: z.string().min(1, 'TELEGRAM_BOT_TOKEN is required'),
  TELEGRAM_CHAT_ID: z.string().optional(),
  
  // Webhook configuration
  WEBHOOK_SECRET: z.string().min(1, 'WEBHOOK_SECRET is required'),
  
  // Default bot credentials
  DEFAULT_BOT_USERNAME: z.string().min(1, 'DEFAULT_BOT_USERNAME is required'),
  DEFAULT_BOT_PASSWORD: z.string().min(6, 'DEFAULT_BOT_PASSWORD must be at least 6 characters'),
  
  // Admin configuration
  ADMIN_PASSWORD: z.string().min(6, 'ADMIN_PASSWORD must be at least 6 characters'),
  
  // Database configuration
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
});

// Validate and parse environment variables
const validateEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues.map(
        (err) => `${err.path.join('.')}: ${err.message}`
      );
      throw new Error(
        `Environment validation failed:\n${errorMessages.join('\n')}`
      );
    }
    throw error;
  }
};

const env = validateEnv();

export const config = {
  port: env.PORT,
  nodeEnv: env.NODE_ENV,
  jwtSecret: env.JWT_SECRET,
  
  telegram: {
    botToken: env.TELEGRAM_BOT_TOKEN,
    chatId: env.TELEGRAM_CHAT_ID,
  },
  
  webhook: {
    secret: env.WEBHOOK_SECRET,
  },
  
  defaultBot: {
    username: env.DEFAULT_BOT_USERNAME,
    password: env.DEFAULT_BOT_PASSWORD,
  },
  
  admin: {
    password: env.ADMIN_PASSWORD,
  },
  
  database: {
    url: env.DATABASE_URL,
  },
};
