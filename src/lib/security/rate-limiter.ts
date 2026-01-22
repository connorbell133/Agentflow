import { NextRequest } from 'next/server';

// Simple in-memory rate limiter
// For production, use Redis or a dedicated rate limiting service
const requestCounts = new Map<string, { count: number; resetTime: number }>();

interface RateLimitConfig {
  windowMs: number;  // Time window in milliseconds
  maxRequests: number;  // Maximum requests per window
}

export function createRateLimiter(config: RateLimitConfig) {
  return {
    check: (identifier: string): { allowed: boolean; remaining: number; resetAt: Date } => {
      const now = Date.now();
      const userLimit = requestCounts.get(identifier);

      // Clean up old entries periodically
      if (requestCounts.size > 10000) {
        const entries = Array.from(requestCounts.entries());
        for (const [key, value] of entries) {
          if (value.resetTime < now) {
            requestCounts.delete(key);
          }
        }
      }

      if (!userLimit || userLimit.resetTime < now) {
        // New window
        requestCounts.set(identifier, {
          count: 1,
          resetTime: now + config.windowMs,
        });
        return {
          allowed: true,
          remaining: config.maxRequests - 1,
          resetAt: new Date(now + config.windowMs),
        };
      }

      if (userLimit.count >= config.maxRequests) {
        // Rate limit exceeded
        return {
          allowed: false,
          remaining: 0,
          resetAt: new Date(userLimit.resetTime),
        };
      }

      // Increment count
      userLimit.count++;
      return {
        allowed: true,
        remaining: config.maxRequests - userLimit.count,
        resetAt: new Date(userLimit.resetTime),
      };
    },
  };
}

// Rate limiters for different types of operations
export const formSubmissionLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 5, // 5 submissions per minute
});

export const authActionLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 10, // 10 auth actions per 15 minutes
});

export const apiCallLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30, // 30 API calls per minute
});

// Helper to get identifier from request
export function getIdentifier(req: NextRequest): string {
  // Try to get user ID from headers or use IP address
  const userId = req.headers.get('x-user-id');
  if (userId) return `user:${userId}`;
  
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : req.headers.get('x-real-ip') || 'unknown';
  return `ip:${ip}`;
}

// Middleware helper
export function checkRateLimit(
  req: NextRequest,
  limiter: ReturnType<typeof createRateLimiter>
): { allowed: boolean; headers: Record<string, string> } {
  const identifier = getIdentifier(req);
  const result = limiter.check(identifier);

  const headers = {
    'X-RateLimit-Limit': limiter.check(identifier).remaining.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.resetAt.toISOString(),
  };

  return {
    allowed: result.allowed,
    headers,
  };
}