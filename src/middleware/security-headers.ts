import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function addSecurityHeaders(request: NextRequest, response: NextResponse) {
  // Build CSP directives dynamically based on environment
  const clerkDomain = process.env.CLERK_DOMAIN;

  // Base Clerk domains
  const clerkScriptSources = [
    'https://*.clerk.com',
    'https://*.clerk.accounts.dev',
    'https://clerk.com'
  ];

  const clerkConnectSources = [
    'https://*.clerk.com',
    'https://*.clerk.accounts.dev',
    'https://api.clerk.com',
    'https://clerk.com',
    'https://clerk-telemetry.com'
  ];

  const clerkFrameSources = [
    'https://*.clerk.com',
    'https://*.clerk.accounts.dev'
  ];

  // Add custom Clerk domain if configured
  if (clerkDomain) {
    const clerkDomainUrl = `https://${clerkDomain}`;
    const clerkDomainWildcard = `https://*.${clerkDomain}`;

    clerkScriptSources.push(clerkDomainUrl, clerkDomainWildcard);
    clerkConnectSources.push(clerkDomainUrl, clerkDomainWildcard);
    clerkFrameSources.push(clerkDomainUrl, clerkDomainWildcard);
  }

  // Content Security Policy
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; " +
    `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${clerkScriptSources.join(' ')} https://js.stripe.com https://*.stripe.com https://vercel.live; ` +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' data: https: blob:; " +
    `connect-src 'self' ${clerkConnectSources.join(' ')} https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://*.stripe.com https://r.stripe.com https://*.ingest.sentry.io ws://localhost:* http://localhost:*; ` +
    `frame-src 'self' ${clerkFrameSources.join(' ')} https://js.stripe.com https://*.stripe.com https://vercel.live; ` +
    "worker-src 'self' blob:; " +
    "frame-ancestors 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self'"
  );
  
  // Other security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // HSTS (only in production)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains'
    );
  }
  
  return response;
}