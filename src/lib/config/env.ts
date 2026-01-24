import { z } from 'zod';

// Server-side environment variables (server only)
const serverEnvSchema = z.object({
  // Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Clerk Authentication
  CLERK_SECRET_KEY: z.string().startsWith('sk_', 'CLERK_SECRET_KEY must start with sk_'),
  CLERK_WEBHOOK_SECRET: z
    .string()
    .startsWith('whsec_', 'CLERK_WEBHOOK_SECRET must start with whsec_'),

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
  // Clerk Public Keys
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z
    .string()
    .startsWith('pk_', 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY must start with pk_'),

  // Clerk URLs
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.string().default('/sign-in'),
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: z.string().default('/sign-up'),
  // New redirect props (replaces deprecated afterSignInUrl/afterSignUpUrl)
  NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL: z.string().default('/'),
  NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL: z.string().default('/'),
  NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL: z.string().optional(),
  NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL: z.string().optional(),
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
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      NEXT_PUBLIC_CLERK_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
      NEXT_PUBLIC_CLERK_SIGN_UP_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL,
      NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL:
        process.env.NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL,
      NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL:
        process.env.NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL,
      NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL:
        process.env.NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL,
      NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL:
        process.env.NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL,
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
