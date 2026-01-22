import { verifyToken } from '@clerk/nextjs/server';

export async function verifyJWT(token: string): Promise<string | null> {
  try {
    // Remove Bearer prefix if present
    const cleanToken = token.replace('Bearer ', '');

    // Only log in development without exposing token
    if (process.env.NODE_ENV === 'development') {
      console.log('Verifying JWT token...');
    }

    // Verify the JWT token with Clerk
    const result = await verifyToken(cleanToken, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    if (process.env.NODE_ENV === 'development') {
      console.log('Token verification result: success');
    }

    if (result && result.sub) {
      // Return the user ID (sub claim contains Clerk user ID)
      return result.sub;
    }

    return null;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('JWT verification failed');
    }
    return null;
  }
}