"use server";

import { auth } from "@clerk/nextjs/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { z } from "zod";
import DOMPurify from "isomorphic-dompurify";
import { formSubmissionLimiter } from "@/lib/security/rate-limiter";

// Server-side validation schema
const tempOrgRequestSchema = z.object({
    orgName: z.string()
        .trim()
        .min(3, 'Organization name must be at least 3 characters')
        .max(50, 'Organization name too long')
        .regex(/^[a-zA-Z0-9\s-]+$/, 'Only letters, numbers, spaces, and hyphens allowed'),
    requestDesc: z.string()
        .trim()
        .min(10, 'Please provide more details (at least 10 characters)')
        .max(500, 'Description too long')
        .transform(val => DOMPurify.sanitize(val)),
    requesterId: z.string().min(1, 'Requester ID is required'),
});

export interface TempOrgRequestData {
    orgName: string;
    requestDesc: string;
    requesterId: string;
}

export async function createTempOrgRequest(data: TempOrgRequestData) {
    try {
        // Check rate limit
        const rateLimitResult = formSubmissionLimiter.check(`user:${data.requesterId}`);
        if (!rateLimitResult.allowed && process.env.NODE_ENV !== 'development') {
            return {
                success: false,
                error: "Too many requests. Please wait a moment before trying again."
            };
        }

        // Validate input data
        const validation = tempOrgRequestSchema.safeParse(data);
        if (!validation.success) {
            return {
                success: false,
                error: validation.error.issues[0]?.message || "Invalid input data"
            };
        }

        const validatedData = validation.data;
        const supabase = await createSupabaseServerClient();

        // Check if user already has a pending request
        const { data: existingRequest, error: checkError } = await supabase
            .from('temp_org_requests')
            .select('id')
            .eq('requester_id', validatedData.requesterId)
            .eq('approved', false)
            .limit(1);

        if (checkError) {
            console.error("Error checking existing request:", checkError);
            return { success: false, error: "Failed to check existing requests" };
        }

        if (existingRequest && existingRequest.length > 0) {
            return {
                success: false,
                error: "You already have a pending organization request. Please wait for approval or contact support."
            };
        }

        const { data: result, error } = await supabase
            .from('temp_org_requests')
            .insert({
                org_name: validatedData.orgName,
                requester_id: validatedData.requesterId,
                request_desc: validatedData.requestDesc,
                approved: false,
                created_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (error) {
            console.error("Error creating temp org request:", error);
            return { success: false, error: "Failed to submit organization request" };
        }

        return { success: true, data: result };
    } catch (error) {
        console.error("Error creating temp org request:", error);
        return { success: false, error: "Failed to submit organization request" };
    }
}

export async function getUserPendingRequest(userId: string) {
    try {
        const supabase = await createSupabaseServerClient();

        const { data: result, error } = await supabase
            .from('temp_org_requests')
            .select('*')
            .eq('requester_id', userId)
            .eq('approved', false)
            .limit(1)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return { success: true, data: null };
            }
            console.error("Error fetching pending request:", error);
            return { success: false, error: "Failed to fetch pending request" };
        }

        return { success: true, data: result };
    } catch (error) {
        console.error("Error fetching pending request:", error);
        return { success: false, error: "Failed to fetch pending request" };
    }
}

export async function getUserApprovedRequest(userId: string) {
    try {
        const supabase = await createSupabaseServerClient();

        const { data: result, error } = await supabase
            .from('temp_org_requests')
            .select('*')
            .eq('requester_id', userId)
            .eq('approved', true)
            .limit(1)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return { success: true, data: null };
            }
            console.error("Error fetching approved request:", error);
            return { success: false, error: "Failed to fetch approved request" };
        }

        return { success: true, data: result };
    } catch (error) {
        console.error("Error fetching approved request:", error);
        return { success: false, error: "Failed to fetch approved request" };
    }
}

export async function markRequestAsUsed(requestId: bigint) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return { success: false, error: "Unauthorized" };
        }

        const supabase = await createSupabaseServerClient();

        const { data: result, error } = await supabase
            .from('temp_org_requests')
            .delete()
            .eq('id', Number(requestId))
            .eq('requester_id', userId)
            .select()
            .single();
        if (error) {
            console.error("Error marking request as used:", error);
            return { success: false, error: "Failed to mark request as used" };
        }

        return { success: true, data: result };
    } catch (error) {
        console.error("Error marking request as used:", error);
        return { success: false, error: "Failed to mark request as used" };
    }
}

export async function cancelTempOrgRequest(requestId: bigint, userId: string) {
    try {
        const supabase = await createSupabaseServerClient();

        const { data: result, error } = await supabase
            .from('temp_org_requests')
            .delete()
            .eq('id', Number(requestId))
            .eq('requester_id', userId)
            .select();

        if (error) {
            console.error("Error canceling temp org request:", error);
            return { success: false, error: "Failed to cancel organization request" };
        }

        if (!result || result.length === 0) {
            return { success: false, error: "Request not found or unauthorized" };
        }

        return { success: true, data: result[0] };
    } catch (error) {
        console.error("Error canceling temp org request:", error);
        return { success: false, error: "Failed to cancel organization request" };
    }
}
