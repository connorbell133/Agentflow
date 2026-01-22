"use server";

import { canInviteUsers as checkCanInviteUsers } from "@/lib/auth/subscription";

/**
 * Server action to check if the current user can invite users
 * This can be called from client components
 */
export async function canInviteUsers(): Promise<boolean> {
  return await checkCanInviteUsers();
}

