"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getUserOrganization(userId: string) {
    try {
        const supabase = await createSupabaseServerClient();

        const { data: orgMapData, error } = await supabase
            .from('org_map')
            .select('org_id')
            .eq('user_id', userId)
            .limit(1);

        if (error) {
            console.error("Error in getUserOrganization:", error);
            return { data: null, error: { message: "Error fetching user organization" } };
        }

        if (!orgMapData || orgMapData.length === 0) {
            return { data: null, error: { message: "User not associated with any organization" } };
        }

        return {
            data: orgMapData[0]?.org_id,
            error: null
        };
    } catch (error) {
        console.error("Error in getUserOrganization:", error);
        return { data: null, error: { message: "Error fetching user organization" } };
    }
}
