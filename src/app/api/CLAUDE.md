# API Route Architecture

Next.js API routes for server-side functionality.

## Directory Structure References
See @admin/CLAUDE.md for administrative endpoints
See @clerk/CLAUDE.md for authentication webhooks
See @cron/CLAUDE.md for scheduled tasks
See @health/CLAUDE.md for system health checks
See @model/CLAUDE.md for AI model endpoints
See @response/CLAUDE.md for chat response handling

## API Design Principles

### RESTful Conventions
- GET - Retrieve resources
- POST - Create resources
- PUT/PATCH - Update resources
- DELETE - Remove resources

### Route Organization
```
/api/
├── admin/        # Protected admin endpoints
├── clerk/        # Clerk webhook handlers
├── cron/         # Scheduled job endpoints
├── health/       # Health check endpoints
├── model/        # AI model operations
└── response/     # Chat response handling
```

## Authentication Pattern
```typescript
import { auth } from '@clerk/nextjs';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // Get auth context
  const { userId, org_id } = auth();
  
  // Check authentication
  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  // Check organization membership
  if (!org_id) {
    return NextResponse.json(
      { error: 'No organization selected' },
      { status: 403 }
    );
  }
  
  // Proceed with authenticated request
}
```

## Request Validation
```typescript
import { z } from 'zod';

// Define request schema
const requestSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  role: z.enum(['user', 'admin']),
  metadata: z.record(z.any()).optional()
});

// Validate request body
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = requestSchema.parse(body);
    
    // Use validated data
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', issues: error.issues },
        { status: 400 }
      );
    }
    throw error;
  }
}
```

## Response Standards

### Success Response
```typescript
{
  success: true,
  data: {
    // Response payload
  },
  metadata: {
    count: number,
    page: number,
    total: number
  }
}
```

### Error Response
```typescript
{
  success: false,
  error: {
    code: 'ERROR_CODE',
    message: 'Human readable message',
    details: {} // Optional additional info
  }
}
```

## Error Handling
```typescript
// Centralized error handler
export function handleApiError(error: unknown): NextResponse {
  console.error('[API Error]', error);
  
  if (error instanceof ValidationError) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: error.message } },
      { status: 400 }
    );
  }
  
  if (error instanceof UnauthorizedError) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Access denied' } },
      { status: 401 }
    );
  }
  
  if (error instanceof NotFoundError) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: error.message } },
      { status: 404 }
    );
  }
  
  // Default error
  return NextResponse.json(
    { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } },
    { status: 500 }
  );
}
```

## Rate Limiting
```typescript
import { rateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const ip = req.ip ?? '127.0.0.1';
  
  const { success } = await rateLimit.limit(ip);
  
  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    );
  }
  
  // Continue with request
}
```

## Database Patterns
```typescript
import { createSupabaseServerClient } from '@/lib/supabase/server';

// Query with Supabase
const result = await db
  .select()
  .from(users)
  .where(eq(users.org_id, org_id))
  .limit(10);

// Use transactions for consistency
await db.transaction(async (tx) => {
  await tx.insert(users).values(userData);
  await tx.update(organizations).set({ userCount: increment(1) });
});
```

## Caching Strategy
```typescript
// Use Next.js caching
export async function GET(req: NextRequest) {
  const data = await fetchData();
  
  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
    }
  });
}

// Or use revalidation
export const revalidate = 60; // Seconds
```

## Security Headers
```typescript
// Apply security headers to all responses
export function withSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  return response;
}
```

## CORS Configuration
```typescript
// Handle CORS for specific routes
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
```

## Logging and Monitoring
```typescript
// Structured logging
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  const start = Date.now();
  
  try {
    const result = await processRequest(req);
    
    logger.info('API Request', {
      method: 'POST',
      path: req.url,
      duration: Date.now() - start,
      status: 'success'
    });
    
    return NextResponse.json(result);
  } catch (error) {
    logger.error('API Error', {
      method: 'POST',
      path: req.url,
      duration: Date.now() - start,
      error: error.message
    });
    
    throw error;
  }
}
```

## Testing API Routes
```bash
# Run API tests
npm test src/app/api

# Test specific endpoints
npm test -- --grep "admin"

# Integration tests
npm run test:integration

# Load testing
npm run test:load
```

## Environment Variables
```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000
API_SECRET_KEY=your-secret-key
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60000
```

## Common Commands
```bash
npm run dev                  # Start dev server
npm test api                # Run API tests
npm run db:migrate         # Run migrations
npm run type-check         # Type checking
npm run lint              # Code linting
```