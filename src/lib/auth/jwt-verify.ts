// JWT verification migrated to Supabase auth
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function verifyJWT(token: string): Promise<string | null> {
  try {
    // Remove Bearer prefix if present
    const cleanToken = token.replace('Bearer ', '');

    // Only log in development without exposing token
    if (process.env.NODE_ENV === 'development') {
      console.log('Verifying JWT token...');
    }

    // Verify the JWT token with Supabase
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(cleanToken);

    if (error || !user) {
      if (process.env.NODE_ENV === 'development') {
        console.error('JWT verification failed:', error?.message);
      }
      return null;
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('Token verification result: success');
    }

    // Return the user ID
    return user.id;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('JWT verification failed');
    }
    return null;
  }
}
