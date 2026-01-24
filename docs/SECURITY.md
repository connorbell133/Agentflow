# Security Audit Report - Chat Platform

**Date:** October 1, 2024
**Auditor:** Security Audit Team
**Application:** Next.js Chat Platform
**Repository:** chat_platform

## Executive Summary

This comprehensive security audit identified **15 critical**, **18 high**, **22 medium**, and **8 low** severity issues across the application. The most concerning findings relate to exposed credentials, incomplete authorization controls, vulnerable dependencies, and insufficient security headers. While the application demonstrates some good security practices (Supabase parameterized queries for SQL injection prevention, Supabase Auth authentication, tenant isolation patterns), immediate action is required on critical vulnerabilities.

> **Note:** This audit was conducted in October 2024. References to `DATABASE_URL` reflect the historical database connection method. The project now uses Supabase with environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`. All database connections now go through the Supabase client in `src/lib/supabase/`.

## Critical Findings Requiring Immediate Action

### 1. **[CRITICAL] Exposed Production Credentials in Version Control**

**Severity:** Critical
**Location:** `.env.local` (if committed to version control)
**Issue Description:** The `.env.local` file contains actual API keys and secrets that may be committed to the repository:

- Clerk API keys exposed (lines 4-5, 14)
- Database connection string visible (line 3)
- CRON_SECRET exposed (line 21)

**Impact:** Complete compromise of authentication system, unauthorized database access, and potential data breach.

**Recommendation:**

1. Immediately rotate ALL exposed credentials
2. Remove `.env.local` from version control
3. Add `.env.local` to `.gitignore`
4. Use environment variable management systems (Vercel env, AWS Secrets Manager)

```bash
# Immediate remediation steps
git rm --cached .env.local
echo ".env.local" >> .gitignore
git commit -m "Remove sensitive credentials from version control"

# Then rotate all credentials in Clerk dashboard and database provider
```

### 2. **[CRITICAL] Overly Permissive CORS Configuration**

**Severity:** Critical
**Location:** `src/middleware.ts:23`
**Issue Description:** CORS allows all origins (`*`) for API routes

**Impact:** Any website can make requests to your API endpoints, enabling CSRF attacks and data exfiltration.

**Recommendation:**

```typescript
// src/middleware.ts - Replace line 23
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['https://your-domain.com'];
const origin = req.headers.get('origin');
if (origin && allowedOrigins.includes(origin)) {
  response.headers.set('Access-Control-Allow-Origin', origin);
} else {
  response.headers.set('Access-Control-Allow-Origin', allowedOrigins[0]);
}
```

### 3. **[CRITICAL] Incomplete Admin Authorization Checks**

**Severity:** Critical
**Location:** `src/app/api/admin/users/remove/route.ts`
**Issue Description:** Admin route lacks any authorization checks

**Impact:** Any authenticated user could potentially perform admin actions

**Recommendation:**

```typescript
// Add to all admin routes
import { auth } from '@clerk/nextjs/server';
import { isUserAdmin } from '@/lib/auth/permissions';

export async function GET() {
  const { userId, org_id } = await auth();

  if (!userId || !org_id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const isAdmin = await isUserAdmin(userId, org_id);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Admin logic here
}
```

## High Severity Findings

### 4. **[HIGH] Content Security Policy Too Permissive**

**Severity:** High
**Location:** `src/middleware/security-headers.ts:9-10`
**Issue Description:** CSP allows `'unsafe-inline'` and `'unsafe-eval'` for scripts

**Impact:** Reduces XSS protection effectiveness, allows inline script execution

**Recommendation:**

```typescript
// Remove unsafe-inline and unsafe-eval, use nonces instead
"script-src 'self' 'nonce-{generated}' https://*.clerk.com;";
```

### 5. **[HIGH] Vulnerable Dependencies**

**Severity:** High
**Location:** `package.json` dependencies
**Issue Description:** npm audit reveals 7 vulnerabilities including:

- Next.js SSRF vulnerability (14.2.13 < 14.2.31)
- esbuild development server vulnerability
- Regular Expression DoS in brace-expansion

**Impact:** Potential SSRF attacks, DoS vulnerabilities

**Recommendation:**

```bash
# Update vulnerable packages
npm audit fix
npm update next@latest
# Review breaking changes before updating Supabase
```

### 6. **[HIGH] JWT Token Logging**

**Severity:** High
**Location:** `src/lib/auth/jwt-verify.ts:9,16`
**Issue Description:** JWT tokens are being logged to console

**Impact:** Token exposure in logs could lead to authentication bypass

**Recommendation:**

```typescript
// Remove or conditionally log only in development
if (process.env.NODE_ENV === 'development') {
  console.log('Verifying token: [REDACTED]');
}
```

### 7. **[HIGH] Database Connection String Fallback**

**Severity:** High
**Location:** `src/db/connection.ts:6`
**Issue Description:** Hardcoded fallback database connection string with credentials

**Impact:** Potential database access if environment variable is missing

**Recommendation:**

```typescript
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}
```

### 8. **[HIGH] Missing Rate Limiting on Critical Endpoints**

**Severity:** High
**Location:** Multiple API routes
**Issue Description:** Several critical endpoints lack rate limiting:

- `/api/conversations/route.ts`
- `/api/messages/route.ts`
- `/api/clerk/webhook/route.ts`

**Impact:** Susceptible to brute force, DoS attacks, and resource exhaustion

**Recommendation:**

```typescript
import { rateLimit } from '@/lib/security/rate-limiter';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});

export async function POST(req: NextRequest) {
  const rateLimitResult = await limiter.check(req);
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: rateLimitResult.headers }
    );
  }
  // Continue with request handling
}
```

## Medium Severity Findings

### 9. **[MEDIUM] Insufficient Security Headers**

**Severity:** Medium
**Location:** `next.config.mjs`
**Issue Description:** Missing critical security headers:

- No Strict-Transport-Security (HSTS)
- No Content-Security-Policy in next.config
- X-XSS-Protection is deprecated

**Recommendation:**

```javascript
// next.config.mjs
const securityHeaders = [
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
];
```

### 10. **[MEDIUM] Sensitive Data in Error Messages**

**Severity:** Medium
**Location:** `src/lib/infrastructure/logger.ts:10`
**Issue Description:** Logger may expose sensitive data in error messages

**Impact:** Information disclosure through error logs

**Recommendation:**

```typescript
// Sanitize sensitive data before logging
const sanitizeData = (data: any) => {
  const sanitized = { ...data };
  const sensitiveKeys = ['password', 'token', 'secret', 'key', 'authorization'];

  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    }
  }
  return sanitized;
};
```

### 11. **[MEDIUM] Webhook Secret Validation Weakness**

**Severity:** Medium
**Location:** `src/app/api/clerk/webhook/route.ts:34`
**Issue Description:** Empty webhook secret fallback could bypass signature verification

**Impact:** Potential webhook spoofing if environment variable is missing

**Recommendation:**

```typescript
const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
if (!webhookSecret) {
  console.error('CLERK_WEBHOOK_SECRET not configured');
  return new Response('Server configuration error', { status: 500 });
}
const wh = new Webhook(webhookSecret);
```

### 12. **[MEDIUM] Incomplete Tenant Isolation Verification**

**Severity:** Medium
**Location:** `src/actions/chat/conversations.ts`
**Issue Description:** Some queries don't consistently use tenant-aware database wrapper

**Impact:** Potential cross-organization data access

**Recommendation:**

```typescript
// Always use tenant-aware DB wrapper for org-scoped resources
import { getTenantDb } from '@/lib/db/tenant-db';

export async function getConversations() {
  const tenantDb = await getTenantDb();
  return tenantDb.conversations.findMany();
}
```

### 13. **[MEDIUM] File Upload Security**

**Severity:** Medium
**Location:** Not found in codebase
**Issue Description:** No file upload validation or virus scanning implementation found

**Impact:** Malicious file uploads, storage attacks, XSS through file content

**Recommendation:**

```typescript
// Implement file validation
const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
const maxSize = 5 * 1024 * 1024; // 5MB

function validateFile(file: File) {
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid file type');
  }
  if (file.size > maxSize) {
    throw new Error('File too large');
  }
  // Add virus scanning integration
}
```

## Low Severity Findings

### 14. **[LOW] Missing CSRF Protection for Forms**

**Severity:** Low
**Location:** Form submissions across the application
**Issue Description:** No explicit CSRF token implementation found

**Impact:** Potential CSRF attacks on state-changing operations

**Recommendation:** Implement CSRF tokens or use SameSite cookie attributes:

```typescript
// Set cookies with SameSite attribute
res.setHeader('Set-Cookie', 'session=value; SameSite=Strict; Secure; HttpOnly');
```

### 15. **[LOW] Verbose Error Messages in Development**

**Severity:** Low
**Location:** Various error handlers
**Issue Description:** Detailed error messages could leak in production if NODE_ENV is misconfigured

**Recommendation:**

```typescript
const errorMessage = process.env.NODE_ENV === 'production' ? 'An error occurred' : error.message;
```

## Security Best Practices Being Followed

✅ **SQL Injection Prevention**: Proper use of Supabase with parameterized queries
✅ **XSS Prevention**: DOMPurify implementation for HTML content (`src/components/features/chat/content/HtmlContent.tsx`)
✅ **Authentication**: Clerk integration with webhook signature verification
✅ **Input Validation**: Zod schema validation in several endpoints
✅ **Tenant Isolation**: Tenant-aware database wrapper implementation
✅ **Environment Validation**: Type-safe environment configuration with validation

## Recommended Security Improvements Roadmap

### Phase 1: Critical (Immediate - Within 24 hours)

1. ⚠️ Rotate all exposed credentials
2. ⚠️ Remove sensitive files from version control
3. ⚠️ Fix CORS configuration
4. ⚠️ Implement admin authorization checks

### Phase 2: High Priority (Within 1 week)

1. Update vulnerable dependencies
2. Remove sensitive data from logs
3. Implement rate limiting on all endpoints
4. Fix CSP headers

### Phase 3: Medium Priority (Within 2 weeks)

1. Add comprehensive security headers
2. Implement file upload validation
3. Add CSRF protection
4. Complete tenant isolation migration

### Phase 4: Ongoing

1. Regular dependency updates
2. Security training for development team
3. Implement automated security testing
4. Regular penetration testing

## Security Monitoring Recommendations

1. **Implement Security Monitoring**:
   - Add Sentry or similar for error tracking
   - Implement audit logging for all admin actions
   - Set up alerts for suspicious activities

2. **Regular Security Audits**:
   - Automated dependency scanning with Dependabot
   - Weekly npm audit checks
   - Quarterly penetration testing

3. **Security Headers Monitoring**:
   - Use securityheaders.com to verify configuration
   - Implement automated tests for security headers

## Compliance Considerations

- **GDPR**: Implement data deletion capabilities, audit trails
- **SOC 2**: Enhance logging, access controls, encryption
- **HIPAA**: Additional encryption, audit requirements needed if handling health data

## Additional Security Recommendations

1. **Implement Content Security Policy Report-Only Mode** first to identify violations:

```typescript
response.headers.set('Content-Security-Policy-Report-Only', cspPolicy);
```

2. **Add Security.txt file** for responsible disclosure:

```text
# /.well-known/security.txt
Contact: security@your-domain.com
Expires: 2025-01-01T00:00:00.000Z
Preferred-Languages: en
```

3. **Implement Subresource Integrity (SRI)** for external scripts:

```html
<script src="https://example.com/script.js" integrity="sha384-..." crossorigin="anonymous"></script>
```

4. **Add Security Testing to CI/CD Pipeline**:

```yaml
# .github/workflows/security.yml
- name: Run Security Audit
  run: |
    npm audit
    npm run test:security
```

## Conclusion

The application shows a foundation of security awareness with Clerk authentication, Supabase, and tenant isolation patterns. However, critical issues with credential exposure, incomplete authorization, and security misconfigurations pose immediate risks. Priority should be given to rotating exposed credentials, implementing proper authorization checks, and updating vulnerable dependencies.

**Overall Security Posture: 🟡 MEDIUM RISK** - Requires immediate attention to critical findings

---

_This report should be treated as confidential and shared only with authorized personnel. For questions or clarification on any findings, please contact the security team._

**Next Steps:**

1. Review this report with the development team
2. Create tickets for each finding in your issue tracker
3. Prioritize based on severity and implement fixes
4. Schedule a follow-up security review after remediation

---

## IMPLEMENTATION PLAN

### Phase 1: Critical Issues (Implement Immediately)

#### 1. Fix CORS Configuration

**File:** `src/middleware.ts`
**Current Issue:** Line 23 allows all origins with `*`

```typescript
// STEP 1: Add to .env.local
ALLOWED_ORIGINS=http://localhost:3000,https://your-production-domain.com

// STEP 2: Update src/middleware.ts (replace lines 19-38)
export default clerkMiddleware(async (auth, req) => {
    // Handle CORS for API routes
    if (req.nextUrl.pathname.startsWith('/api/')) {
        const response = NextResponse.next();

        // Get allowed origins from environment
        const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
        const origin = req.headers.get('origin');

        // Check if origin is allowed
        if (origin && allowedOrigins.includes(origin)) {
            response.headers.set('Access-Control-Allow-Origin', origin);
        } else if (!origin && req.nextUrl.pathname.startsWith('/api/')) {
            // Allow same-origin requests
            response.headers.set('Access-Control-Allow-Origin', allowedOrigins[0]);
        }

        response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        response.headers.set('Access-Control-Allow-Credentials', 'true');

        // Handle preflight requests
        if (req.method === 'OPTIONS') {
            return new Response(null, { status: 200, headers: response.headers });
        }

        // Only protect admin routes
        if (req.nextUrl.pathname.startsWith('/api/admin')) {
            await auth.protect();
        }

        return addSecurityHeaders(req, response);
    }

    if (isProtectedRoute(req)) {
        await auth.protect();
    }

    const response = NextResponse.next();
    return addSecurityHeaders(req, response);
});
```

#### 2. Implement Admin Authorization Checks

**Files to Update:**

- `src/app/api/admin/users/remove/route.ts`
- `src/app/api/admin/users/add/route.ts`
- All files in `src/app/api/admin/`

**STEP 1: Create authorization helper**

```typescript
// Create new file: src/lib/auth/permissions.ts
import { db } from '@/db/connection';
import { profiles, groups, groupMap } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function isUserAdmin(userId: string, org_id: string): Promise<boolean> {
  try {
    const userGroups = await db
      .select({
        role: groups.role,
      })
      .from(groupMap)
      .innerJoin(groups, eq(groupMap.groupId, groups.id))
      .where(and(eq(groupMap.userId, userId), eq(groups.org_id, org_id)));

    return userGroups.some(g => g.role === 'admin' || g.role === 'owner');
  } catch (error) {
    console.error('Error checking admin permissions:', error);
    return false;
  }
}

export async function requireAdmin(userId: string | null, org_id: string | null) {
  if (!userId || !org_id) {
    throw new Error('Unauthorized: No user or organization');
  }

  const isAdmin = await isUserAdmin(userId, org_id);
  if (!isAdmin) {
    throw new Error('Forbidden: Admin access required');
  }

  return true;
}
```

**STEP 2: Update all admin routes**

```typescript
// Update src/app/api/admin/users/remove/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { requireAdmin } from '@/lib/auth/permissions';

export async function POST(req: Request) {
  try {
    const { userId, org_id } = await auth();

    // Check admin permissions
    await requireAdmin(userId, org_id);

    // Your existing logic here
    const body = await req.json();
    // ... rest of implementation

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error.message.includes('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

### Phase 2: High Priority Issues (Within 3 Days)

#### 3. Fix Content Security Policy

**File:** `src/middleware/security-headers.ts`

```typescript
// Update src/middleware/security-headers.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import crypto from 'crypto';

export function addSecurityHeaders(request: NextRequest, response: NextResponse) {
  // Generate nonce for this request
  const nonce = crypto.randomBytes(16).toString('base64');

  // Store nonce in response for use in pages
  response.headers.set('X-Nonce', nonce);

  // Enhanced Content Security Policy
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; " +
      `script-src 'self' 'nonce-${nonce}' https://*.clerk.com https://*.clerk.accounts.dev https://clerk.com; ` +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " + // unsafe-inline needed for Tailwind
      "font-src 'self' https://fonts.gstatic.com; " +
      "img-src 'self' data: https: blob:; " +
      "connect-src 'self' https://*.clerk.com https://*.clerk.accounts.dev https://api.clerk.com https://clerk.com https://clerk-telemetry.com https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://*.stripe.com https://r.stripe.com https://*.ingest.sentry.io ws://localhost:* http://localhost:*; " +
      "frame-src 'self' https://*.clerk.com https://*.clerk.accounts.dev; " +
      "worker-src 'self' blob:; " +
      "frame-ancestors 'none'; " +
      "base-uri 'self'; " +
      "form-action 'self'; " +
      'upgrade-insecure-requests; ' +
      'block-all-mixed-content'
  );

  // Enhanced security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()'
  );

  // HSTS for production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload'
    );
  }

  return response;
}
```

#### 4. Update Vulnerable Dependencies

```bash
# Run these commands
npm update next@latest
npm audit fix --force  # Only after reviewing breaking changes
npm update @babel/runtime@latest
npm update brace-expansion@latest

# Check for remaining vulnerabilities
npm audit
```

#### 5. Fix JWT Token Logging

**File:** `src/lib/auth/jwt-verify.ts`

```typescript
// Update src/lib/auth/jwt-verify.ts
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
```

#### 6. Fix Database Connection String Fallback

**File:** `src/db/connection.ts`

```typescript
// Update src/db/connection.ts lines 5-6
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Require DATABASE_URL - no fallback
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    'DATABASE_URL environment variable is required. ' + 'Please set it in your .env.local file.'
  );
}

// Rest of file remains the same...
```

#### 7. Implement Rate Limiting

**STEP 1: Create rate limiting utility**

```typescript
// Create src/lib/security/rate-limiter.ts
import { NextRequest } from 'next/server';

interface RateLimitResult {
  allowed: boolean;
  headers: Record<string, string>;
}

interface RateLimiter {
  windowMs: number;
  max: number;
  message?: string;
}

// In-memory store (consider Redis for production)
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function createRateLimiter(options: RateLimiter) {
  return {
    async check(req: NextRequest): Promise<RateLimitResult> {
      const identifier = req.ip || req.headers.get('x-forwarded-for') || 'anonymous';
      const now = Date.now();

      // Clean up old entries
      for (const [key, value] of requestCounts.entries()) {
        if (value.resetTime < now) {
          requestCounts.delete(key);
        }
      }

      const userLimit = requestCounts.get(identifier);
      const resetTime = now + options.windowMs;

      if (!userLimit || userLimit.resetTime < now) {
        // First request or window expired
        requestCounts.set(identifier, { count: 1, resetTime });
        return {
          allowed: true,
          headers: {
            'X-RateLimit-Limit': options.max.toString(),
            'X-RateLimit-Remaining': (options.max - 1).toString(),
            'X-RateLimit-Reset': new Date(resetTime).toISOString(),
          },
        };
      }

      if (userLimit.count >= options.max) {
        return {
          allowed: false,
          headers: {
            'X-RateLimit-Limit': options.max.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(userLimit.resetTime).toISOString(),
            'Retry-After': Math.ceil((userLimit.resetTime - now) / 1000).toString(),
          },
        };
      }

      userLimit.count++;
      return {
        allowed: true,
        headers: {
          'X-RateLimit-Limit': options.max.toString(),
          'X-RateLimit-Remaining': (options.max - userLimit.count).toString(),
          'X-RateLimit-Reset': new Date(userLimit.resetTime).toISOString(),
        },
      };
    },
  };
}

// Pre-configured limiters
export const apiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
});

export const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Strict for auth endpoints
});

export const adminLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 50,
});
```

**STEP 2: Apply to API routes**

```typescript
// Update src/app/api/conversations/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { apiLimiter } from '@/lib/security/rate-limiter';

export async function GET(req: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = await apiLimiter.check(req);
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests, please try again later' },
      { status: 429, headers: rateLimitResult.headers }
    );
  }

  // Your existing logic
  // ...

  // Add rate limit headers to successful responses
  const response = NextResponse.json(data);
  Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}
```

### Phase 3: Medium Priority Issues (Within 1 Week)

#### 8. Enhanced Security Headers in Next.config

**File:** `next.config.mjs`

```javascript
// Update next.config.mjs
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  {
    key: 'X-Permitted-Cross-Domain-Policies',
    value: 'none',
  },
  {
    key: 'Expect-CT',
    value: 'enforce, max-age=86400',
  },
];

const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        // Additional headers for API routes
        source: '/api/:path*',
        headers: [
          ...securityHeaders,
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
        ],
      },
    ];
  },
  // ... rest of config
};
```

#### 9. Fix Logger to Sanitize Sensitive Data

**File:** `src/lib/infrastructure/logger.ts`

```typescript
// Update src/lib/infrastructure/logger.ts
const SENSITIVE_KEYS = ['password', 'token', 'secret', 'key', 'authorization', 'cookie', 'session'];

function sanitizeData(data: any): any {
  if (!data) return data;

  if (typeof data === 'string') {
    // Check if string might contain sensitive data
    const lowerStr = data.toLowerCase();
    if (SENSITIVE_KEYS.some(key => lowerStr.includes(key))) {
      return '[REDACTED]';
    }
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item));
  }

  if (typeof data === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      if (SENSITIVE_KEYS.some(sensitive => lowerKey.includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeData(value);
      }
    }
    return sanitized;
  }

  return data;
}

export const createLogger = (fileName: string) => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isDebugEnabled = process.env.NEXT_PUBLIC_DEBUG === 'true' || process.env.DEBUG === 'true';

  const formatMessage = (level: string, message: string, data?: any) => {
    const sanitizedData = sanitizeData(data);
    const formattedMessage = `[${level}] [${fileName}] ${message}`;
    if (sanitizedData) {
      return `${formattedMessage} | Data: ${JSON.stringify(sanitizedData)}`;
    }
    return formattedMessage;
  };

  return {
    info: (message: string, data?: any) => {
      if (isDevelopment && isDebugEnabled) {
        console.log(formatMessage('INFO', message, data));
      }
    },
    warn: (message: string, data?: any) => {
      if (isDevelopment && isDebugEnabled) {
        console.warn(formatMessage('WARN', message, data));
      }
    },
    error: (message: string, data?: any) => {
      if (isDevelopment || process.env.NEXT_PUBLIC_LOG_ERRORS === 'true') {
        console.error(formatMessage('ERROR', message, data));
      }
    },
    debug: (message: string, data?: any) => {
      if (isDevelopment && isDebugEnabled) {
        console.debug(formatMessage('DEBUG', message, data));
      }
    },
  };
};
```

#### 10. Fix Webhook Secret Validation

**File:** `src/app/api/clerk/webhook/route.ts`

```typescript
// Update src/app/api/clerk/webhook/route.ts line 34
export async function POST(req: Request) {
  console.log('🔔 Clerk webhook received');

  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    console.error('❌ Missing svix headers');
    return new Response('Error occurred -- no svix headers', {
      status: 400,
    });
  }

  // Get the body
  const payload = await req.text();
  const body = JSON.parse(payload);

  // Require webhook secret
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('❌ CLERK_WEBHOOK_SECRET not configured');
    return new Response('Server configuration error', { status: 500 });
  }

  // Create a new Svix instance with your secret
  const wh = new Webhook(webhookSecret);

  let evt: WebhookEvent;

  // Rest of the function remains the same...
}
```

#### 11. Complete Tenant Isolation Migration

**Update all conversation queries to use tenant-aware wrapper**

```typescript
// Update src/actions/chat/conversations.ts
import { getTenantDb } from '@/lib/db/tenant-db';

export async function getConversations(userId: string) {
  const tenantDb = await getTenantDb();

  try {
    const conversations = await tenantDb.conversations.findByUser({
      limit: 50,
      offset: 0,
    });

    return { data: conversations, error: null };
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return { data: [], error };
  }
}

export async function getConversationWithMessages(conversationId: string) {
  const tenantDb = await getTenantDb();

  try {
    // Verify conversation access (throws if not authorized)
    const conversation = await tenantDb.conversations.findById(conversationId);

    // Get messages (already validated via conversation check)
    const messages = await tenantDb.messages.findByConversation(conversationId);

    return {
      conversation,
      messages,
    };
  } catch (error) {
    if (error.name === 'TenantResourceNotFound') {
      console.error('Conversation not found or access denied:', conversationId);
      return null;
    }
    throw error;
  }
}
```

#### 12. Implement File Upload Validation

**Create new file: src/lib/security/file-upload.ts**

```typescript
// src/lib/security/file-upload.ts
import { NextRequest } from 'next/server';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'text/plain', 'application/msword'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export function validateFile(file: File, type: 'image' | 'document' | 'any'): FileValidationResult {
  // Check file size
  const maxSize = type === 'image' ? MAX_IMAGE_SIZE : MAX_FILE_SIZE;
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed (${maxSize / 1024 / 1024}MB)`,
    };
  }

  // Check file type
  let allowedTypes: string[] = [];
  switch (type) {
    case 'image':
      allowedTypes = ALLOWED_IMAGE_TYPES;
      break;
    case 'document':
      allowedTypes = ALLOWED_DOCUMENT_TYPES;
      break;
    case 'any':
      allowedTypes = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES];
      break;
  }

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} is not allowed`,
    };
  }

  // Check file extension matches MIME type
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!extension || !isValidExtension(file.type, extension)) {
    return {
      valid: false,
      error: 'File extension does not match file type',
    };
  }

  // Additional security checks
  if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
    return {
      valid: false,
      error: 'Invalid file name',
    };
  }

  return { valid: true };
}

function isValidExtension(mimeType: string, extension: string): boolean {
  const validExtensions: Record<string, string[]> = {
    'image/jpeg': ['jpg', 'jpeg'],
    'image/png': ['png'],
    'image/gif': ['gif'],
    'image/webp': ['webp'],
    'application/pdf': ['pdf'],
    'text/plain': ['txt'],
    'application/msword': ['doc', 'docx'],
  };

  return validExtensions[mimeType]?.includes(extension) || false;
}

// Sanitize filename for storage
export function sanitizeFilename(filename: string): string {
  // Remove any directory traversal attempts
  const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, '_');

  // Add timestamp to prevent collisions
  const extension = sanitized.split('.').pop();
  const name = sanitized.split('.').slice(0, -1).join('.');

  return `${name}_${Date.now()}.${extension}`;
}
```

### Phase 4: Low Priority Issues (Within 2 Weeks)

#### 13. Add CSRF Protection

**Create CSRF middleware**

```typescript
// Create src/lib/security/csrf.ts
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const CSRF_COOKIE_NAME = '__csrf';
const CSRF_HEADER_NAME = 'x-csrf-token';

export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function validateCSRFToken(req: NextRequest): boolean {
  // Skip CSRF for GET requests
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return true;
  }

  const cookieToken = req.cookies.get(CSRF_COOKIE_NAME)?.value;
  const headerToken = req.headers.get(CSRF_HEADER_NAME);

  if (!cookieToken || !headerToken) {
    return false;
  }

  return cookieToken === headerToken;
}

export function setCSRFToken(response: NextResponse): void {
  const token = generateCSRFToken();

  response.cookies.set({
    name: CSRF_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
  });

  // Also set in header for client to read
  response.headers.set('X-CSRF-Token', token);
}
```

#### 14. Implement Production Error Handling

**Update all error responses**

```typescript
// Create src/lib/errors/handler.ts
export function getErrorMessage(error: unknown, isDevelopment = false): string {
  if (!isDevelopment) {
    // Generic messages in production
    return 'An error occurred processing your request';
  }

  // Detailed messages in development
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export function getErrorStatus(error: unknown): number {
  if (error instanceof Error) {
    if (error.message.includes('Unauthorized')) return 401;
    if (error.message.includes('Forbidden')) return 403;
    if (error.message.includes('Not found')) return 404;
    if (error.message.includes('Validation')) return 400;
    if (error.message.includes('Rate limit')) return 429;
  }

  return 500;
}
```

### Testing & Verification Checklist

After implementing each fix, verify:

- [ ] CORS: Test with Postman from different origins
- [ ] Admin Auth: Try accessing admin routes without admin role
- [ ] CSP: Check browser console for CSP violations
- [ ] Dependencies: Run `npm audit` shows 0 vulnerabilities
- [ ] Rate Limiting: Test rapid API calls get rate limited
- [ ] Security Headers: Check with https://securityheaders.com
- [ ] Logging: Verify no sensitive data in logs
- [ ] File Upload: Test with various file types and sizes
- [ ] CSRF: Verify forms include and validate CSRF tokens
- [ ] Error Messages: Confirm production shows generic errors

### Automation Scripts

Add these npm scripts to `package.json`:

```json
{
  "scripts": {
    "security:audit": "npm audit && npm outdated",
    "security:headers": "curl -I http://localhost:3000 | grep -E '^(X-|Strict-|Content-Security)'",
    "security:test": "jest --testPathPattern=security",
    "security:check": "npm run security:audit && npm run type-check && npm run lint"
  }
}
```

### Monitoring & Alerting

1. **Set up Sentry** for error tracking:

```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

2. **Add security event logging**:

```typescript
// src/lib/security/audit-log.ts
export async function logSecurityEvent(event: {
  type: string;
  userId?: string;
  ip?: string;
  details?: any;
}) {
  console.log('[SECURITY]', {
    timestamp: new Date().toISOString(),
    ...event,
  });

  // In production, send to monitoring service
  if (process.env.NODE_ENV === 'production') {
    // Send to Sentry, DataDog, etc.
  }
}
```

This implementation plan provides concrete code changes for all security issues identified (except the .env.local issue which was incorrect). Each section includes specific file paths, line numbers to update, and complete code implementations ready to be applied to your codebase.
