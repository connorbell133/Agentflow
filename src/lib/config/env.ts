import { z } from 'zod';

// Server-side environment variables (server only)
const serverEnvSchema = z.object({
  // Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),

  // Cron Secret
  CRON_SECRET: z.string().min(32, 'CRON_SECRET must be at least 32 characters'),

  // Optional flags
  SKIP_CACHE: z
    .string()
    .optional()
    .transform(val => val === 'true'),
});

// Client-side environment variables (public)
const clientEnvSchema = z.object({
  // Supabase Public Keys
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),

  // Application URL
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url('NEXT_PUBLIC_APP_URL must be a valid URL')
    .default('http://localhost:3000'),
});

// Combined schema for server-side usage
const envSchema = serverEnvSchema.merge(clientEnvSchema);

// Type-safe environment variables
export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type ClientEnv = z.infer<typeof clientEnvSchema>;
export type Env = z.infer<typeof envSchema>;

// Format validation errors for better debugging
function formatErrors(zodError: z.ZodError<any>): string {
  return zodError.issues.map(err => `  - ${err.path.join('.')}: ${err.message}`).join('\n');
}

// Server environment (server-side only)
function createServerEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Invalid environment variables:\n' + formatErrors(error));
      console.error(
        '\n📋 Please check your .env.local file and ensure all required variables are set.'
      );
      console.error('   Refer to .env.example for the correct format.\n');

      // Fail fast in production
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Invalid environment variables in production');
      }

      // More detailed error in development
      throw new Error(`Invalid environment variables:\n${formatErrors(error)}`);
    }
    throw error;
  }
}

// Client environment (client-side safe)
function createClientEnv(): ClientEnv {
  try {
    return clientEnvSchema.parse({
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Invalid client environment variables:\n' + formatErrors(error));
      throw new Error(`Invalid client environment variables:\n${formatErrors(error)}`);
    }
    throw error;
  }
}

// Export based on context
export const env = typeof window === 'undefined' ? createServerEnv() : (createClientEnv() as Env);

// Helper to check if all required environment variables are set
export function validateEnv(): void {
  if (typeof window === 'undefined') {
    createServerEnv();
  } else {
    createClientEnv();
  }
}
