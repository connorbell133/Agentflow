import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { addSecurityHeaders } from './middleware/security-headers';

const isProtectedRoute = createRouteMatcher([
    '/',
    '/admin(.*)',
    '/flow(.*)',
    '/api/admin(.*)',
    '/api/response',
    '/api/model',
    '/api/conversations(.*)',
    '/api/messages',
    '/api/models',
]);

// Header name for passing Supabase token from middleware to server components/actions
export const SUPABASE_TOKEN_HEADER = 'x-supabase-token';

// Cookie name for caching Supabase token across requests
const SUPABASE_TOKEN_COOKIE = '__supabase_token';
// Cache token for 50 seconds (Clerk tokens expire at 60s, 10s buffer)
const TOKEN_CACHE_MAX_AGE = 50;

export default clerkMiddleware(async (auth, req) => {
    // Handle preflight requests first (no auth needed)
    if (req.method === 'OPTIONS') {
        const response = NextResponse.next();
        const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
        const origin = req.headers.get('origin');
        if (origin && allowedOrigins.includes(origin)) {
            response.headers.set('Access-Control-Allow-Origin', origin);
        }
        response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        response.headers.set('Access-Control-Allow-Credentials', 'true');
        return new Response(null, { status: 200, headers: response.headers });
    }

    // Protect routes that require authentication
    const isApiAdminRoute = req.nextUrl.pathname.startsWith('/api/admin');
    if (isApiAdminRoute || isProtectedRoute(req)) {
        await auth.protect();
    }

    // Try to get Supabase token from cookie cache first (avoids Clerk API call)
    let supabaseToken: string | null = req.cookies.get(SUPABASE_TOKEN_COOKIE)?.value ?? null;
    let needsTokenRefresh = !supabaseToken;

    // If no cached token, get fresh one from Clerk
    if (needsTokenRefresh) {
        try {
            const { getToken } = await auth();
            // Use Supabase JWT template - required for RLS policies using auth.jwt()->>'sub'
            supabaseToken = await getToken({ template: 'supabase' });
        } catch {
            // Token fetch failed (user not authenticated) - continue without token
        }
    }

    // Pass token via request header so server components/actions can read it
    const requestHeaders = new Headers(req.headers);
    if (supabaseToken) {
        requestHeaders.set(SUPABASE_TOKEN_HEADER, supabaseToken);
    }

    const response = NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    });

    // Cache the token in a cookie for subsequent requests (reduces Clerk API calls)
    if (supabaseToken && needsTokenRefresh) {
        response.cookies.set(SUPABASE_TOKEN_COOKIE, supabaseToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: TOKEN_CACHE_MAX_AGE,
            path: '/',
        });
    }

    // Add CORS headers for API routes
    if (req.nextUrl.pathname.startsWith('/api/')) {
        const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
        const origin = req.headers.get('origin');

        if (origin && allowedOrigins.includes(origin)) {
            response.headers.set('Access-Control-Allow-Origin', origin);
        } else if (!origin) {
            response.headers.set('Access-Control-Allow-Origin', allowedOrigins[0]);
        }

        response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        response.headers.set('Access-Control-Allow-Credentials', 'true');
    }

    return addSecurityHeaders(req, response);
});

export const config = {
    matcher: [
        // Skip Next.js internals and all static files, unless found in search params
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Always run for API routes
        '/(api|trpc)(.*)',
        // Include admin routes with catch-all
        '/admin/(.*)',
    ],
};
