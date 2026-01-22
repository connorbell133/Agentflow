"use server";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { createLogger } from "@/lib/infrastructure/logger";

const logger = createLogger("profile-sync");

export interface ProfileSyncData {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string | null;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Ensures a profile exists for the given user, creating it if necessary.
 * This function is idempotent and safe to call multiple times.
 * Uses admin client to bypass RLS for initial profile creation.
 */
export async function ensureProfileExists(data: ProfileSyncData) {
  let lastError: unknown;

  // Use admin client to bypass RLS for profile creation
  const supabase = getSupabaseAdminClient();

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      logger.info("Attempting to ensure profile exists", {
        userId: data.id,
        attempt,
        email: data.email
      });

      // First, check if profile already exists
      const { data: existing, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.id)
        .single();

      if (existing && !fetchError) {
        logger.info("Profile already exists", { userId: data.id });
        return { success: true, data: existing, created: false };
      }

      // Profile doesn't exist, create it using upsert
      const { data: result, error: upsertError } = await supabase
        .from('profiles')
        .upsert({
          id: data.id,
          email: data.email,
          full_name: data.fullName,
          avatar_url: data.avatarUrl,
          signup_complete: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'id'
        })
        .select()
        .single();

      if (upsertError) {
        throw upsertError;
      }

      logger.info("Profile created successfully", { userId: data.id });
      return { success: true, data: result, created: true };

    } catch (error) {
      lastError = error;
      logger.error("Error ensuring profile exists", {
        error,
        userId: data.id,
        attempt
      });

      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY * attempt);
      }
    }
  }

  // All retries failed
  logger.error("Failed to ensure profile exists after all retries", {
    userId: data.id,
    error: lastError
  });

  return {
    success: false,
    error: "Failed to create profile after multiple attempts",
    details: lastError
  };
}

/**
 * Sync profile data from Clerk to our database
 */
export async function syncProfileFromClerk(
  clerkUserId: string,
  clerkData: {
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    imageUrl?: string | null;
  }
) {
  const fullName = `${clerkData.firstName || ""} ${clerkData.lastName || ""}`.trim() || "User";

  return ensureProfileExists({
    id: clerkUserId,
    email: clerkData.email,
    fullName,
    avatarUrl: clerkData.imageUrl,
  });
}
