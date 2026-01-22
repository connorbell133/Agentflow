"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";
import { authActionLimiter } from "@/lib/security/rate-limiter";

// Server-side validation schema
const profileUpdateSchema = z.object({
    fullName: z.string()
        .trim()
        .min(2, 'Name must be at least 2 characters')
        .max(100, 'Name too long'),
    email: z.string()
        .email('Invalid email')
        .toLowerCase()
        .max(255),
    avatarUrl: z.string().url('Invalid URL').optional().nullable(),
    signupComplete: z.boolean().optional(),
});

export interface ProfileUpdateData {
    fullName: string;
    email: string;
    avatarUrl?: string;
    signupComplete?: boolean;
}

export async function updateProfile(userId: string, data: ProfileUpdateData) {
    try {
        // Check rate limit
        const rateLimitResult = authActionLimiter.check(`user:${userId}`);
        if (!rateLimitResult.allowed && process.env.NODE_ENV !== 'development') {
            return {
                success: false,
                error: "Too many requests. Please wait a moment before trying again."
            };
        }

        // Validate input data
        const validation = profileUpdateSchema.safeParse(data);
        if (!validation.success) {
            return {
                success: false,
                error: validation.error.issues[0]?.message || "Invalid input data"
            };
        }

        const validatedData = validation.data;
        const supabase = await createSupabaseServerClient();

        // Only include signup_complete if explicitly provided to avoid resetting it
        const updateData: Record<string, unknown> = {
            full_name: validatedData.fullName,
            email: validatedData.email,
            avatar_url: validatedData.avatarUrl,
            updated_at: new Date().toISOString(),
        };
        if (validatedData.signupComplete !== undefined) {
            updateData.signup_complete = validatedData.signupComplete;
        }

        const { data: result, error } = await supabase
            .from('profiles')
            .update(updateData)
            .eq('id', userId)
            .select()
            .single();

        if (error) {
            console.error("Error updating profile:", error);
            return { success: false, error: "Failed to update profile" };
        }

        return { success: true, data: result };
    } catch (error) {
        console.error("Error updating profile:", error);
        return { success: false, error: "Failed to update profile" };
    }
}

export async function createProfile(userId: string, data: ProfileUpdateData) {
    try {
        // Validate input data
        const validation = profileUpdateSchema.safeParse(data);
        if (!validation.success) {
            return {
                success: false,
                error: validation.error.issues[0]?.message || "Invalid input data"
            };
        }

        const validatedData = validation.data;

        // Use admin client for profile creation (bypasses RLS for initial creation)
        const supabase = getSupabaseAdminClient();

        const { data: result, error } = await supabase
            .from('profiles')
            .insert({
                id: userId,
                full_name: validatedData.fullName,
                email: validatedData.email,
                avatar_url: validatedData.avatarUrl,
                signup_complete: validatedData.signupComplete ?? false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (error) {
            console.error("Error creating profile:", error);
            return { success: false, error: "Failed to create profile" };
        }

        return { success: true, data: result };
    } catch (error) {
        console.error("Error creating profile:", error);
        return { success: false, error: "Failed to create profile" };
    }
}

export async function getProfile(userId: string) {
    try {
        const supabase = await createSupabaseServerClient();

        const { data: result, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) {
            // Profile not found is not an error
            if (error.code === 'PGRST116') {
                return { success: true, data: null };
            }
            console.error("Error fetching profile:", error);
            return { success: false, error: "Failed to fetch profile" };
        }

        return { success: true, data: result };
    } catch (error) {
        console.error("Error fetching profile:", error);
        return { success: false, error: "Failed to fetch profile" };
    }
}

export async function markSignupComplete(userId: string) {
    try {
        const supabase = await createSupabaseServerClient();

        const { data: result, error } = await supabase
            .from('profiles')
            .update({
                signup_complete: true,
                updated_at: new Date().toISOString(),
            })
            .eq('id', userId)
            .select()
            .single();

        if (error) {
            console.error("Error marking signup complete:", error);
            return { success: false, error: "Failed to mark signup complete" };
        }

        return { success: true, data: result };
    } catch (error) {
        console.error("Error marking signup complete:", error);
        return { success: false, error: "Failed to mark signup complete" };
    }
}
