/**
 * Next.js Middleware with Supabase Auth
 *
 * This middleware:
 * 1. Refreshes Supabase Auth sessions
 * 2. Protects routes that require authentication
 * 3. Redirects unauthenticated users to sign-in
 * 4. Adds security headers
 *
 * @see https://supabase.com/docs/guides/auth/server-side/nextjs
 */

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { addSecurityHeaders } from './middleware/security-headers';

// Define protected routes
const PROTECTED_ROUTES = [
  '/',
  '/admin',
  '/flow',
  '/api/admin',
  '/api/response',
  '/api/model',
  '/api/conversations',
  '/api/messages',
  '/api/models',
  '/api/chat',
  '/api/invites',
  '/api/groups',
  '/api/user',
  '/api/bug-report',
];

// Public routes that don't require authentication
const PUBLIC_ROUTES = ['/sign-in', '/sign-up', '/auth'];

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some(route => {
    if (route.endsWith('*')) {
      return pathname.startsWith(route.slice(0, -1));
    }
    return pathname === route || pathname.startsWith(route + '/');
  });
}

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => {
    return pathname === route || pathname.startsWith(route + '/');
  });
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

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

  // Create Supabase client for middleware
  let supabaseResponse = NextResponse.next({
    request: req,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => req.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request: req,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session if expired - required for Server Components
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Check if route requires authentication
  const requiresAuth = isProtectedRoute(pathname);
  const isPublic = isPublicRoute(pathname);

  // Redirect to sign-in if protected route and no session
  if (requiresAuth && !user && !isPublic) {
    const signInUrl = new URL('/sign-in', req.url);
    signInUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Redirect to /flow if already signed in and trying to access auth pages
  if (user && (pathname === '/sign-in' || pathname === '/sign-up')) {
    return NextResponse.redirect(new URL('/flow', req.url));
  }

  // Add CORS headers for API routes
  if (pathname.startsWith('/api/')) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
    const origin = req.headers.get('origin');

    if (origin && allowedOrigins.includes(origin)) {
      supabaseResponse.headers.set('Access-Control-Allow-Origin', origin);
    } else if (!origin) {
      supabaseResponse.headers.set('Access-Control-Allow-Origin', allowedOrigins[0]);
    }

    supabaseResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    supabaseResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    supabaseResponse.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  return addSecurityHeaders(req, supabaseResponse);
}

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
