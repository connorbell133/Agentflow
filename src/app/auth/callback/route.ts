/**
 * Auth Callback Handler
 *
 * Handles authentication callbacks from Supabase (email confirmations, OAuth, etc.)
 */

import { createClient } from '@/lib/auth/supabase-server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/flow';

  if (code) {
    const supabase = await createClient();

    // Exchange the code for a session
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Redirect to the next page or /flow
  return NextResponse.redirect(new URL(next, request.url));
}
