import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createLogger } from "@/lib/infrastructure/logger";

const logger = createLogger("profile-sync-health");

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    // Get profile count using Supabase
    const { count, error } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true });

    if (error) {
      throw error;
    }

    const profileCount = count ?? 0;

    const status = {
      healthy: true,
      profiles: profileCount,
      message: "Profile sync health check - Clerk user count requires admin SDK",
      note: "ProfileCompletionProvider ensures profiles are created on login",
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(status, { status: 200 });
  } catch (error) {
    logger.error("Profile sync health check error", { error });
    return NextResponse.json(
      {
        healthy: false,
        error: "Failed to check profile sync status",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
