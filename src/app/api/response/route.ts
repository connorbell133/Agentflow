import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';
import { getModelData } from '@/actions/chat/models';
import { createLogger } from '@/lib/infrastructure/logger';
import { Model } from '@/lib/supabase/types';
import { RequestBody, ApiResponse } from '@/types/api/response.types';
import { buildBodyJson, getByPath } from '@/lib/api/model-utils';
import { z } from 'zod';
import { apiCallLimiter, checkRateLimit } from '@/lib/security/rate-limiter';

const logger = createLogger('api-response');

// Request body schema (userId removed as it comes from auth)
const requestBodySchema = z.object({
  model: z.string().min(1, 'Model is required'),
  content: z.string().min(1, 'Content is required').max(10000, 'Content too long'),
  conversationId: z.string().uuid().optional(),
  vars: z.record(z.string(), z.any()).optional(),
});

async function callCustomEndpoint(modelData: Model, body: any): Promise<ApiResponse> {
  const endpoint = (modelData as any)?.endpoint as string;
  const method = ((modelData as any)?.method || 'POST').toUpperCase();
  if (!endpoint) {
    throw new Error('Custom endpoint not found');
  }

  logger.info('Calling custom endpoint:', endpoint);

  const hasBody = method !== 'GET' && method !== 'HEAD';
  const headers = hasBody
    ? {
        'Content-Type': 'application/json',
        ...((modelData.headers as Record<string, string>) || {}),
      }
    : { ...((modelData.headers as Record<string, string>) || {}) };

  const fetchInit: RequestInit = {
    method,
    headers,
  };

  if (hasBody && body !== undefined) {
    fetchInit.body = JSON.stringify(body);
  }

  const res = await fetch(endpoint, fetchInit);

  const rawBody = await res.text();

  if (!res.ok) {
    logger.error('Custom endpoint error', { status: res.status, body: rawBody });
    throw new Error(`Custom endpoint error: ${res.status}`);
  }

  let parsed: any = null;
  try {
    parsed = rawBody ? JSON.parse(rawBody) : null;
  } catch {
    parsed = null;
  }

  const response_path = modelData.response_path;

  if (response_path && parsed && typeof parsed === 'object') {
    const response = getByPath(parsed, response_path);
    return {
      response: response,
      responseType: 'text',
    };
  }

  if (parsed && typeof parsed === 'object') {
    return {
      response: parsed.response ?? JSON.stringify(parsed),
      responseType: 'text',
    };
  }

  return {
    response: rawBody,
    responseType: 'text',
  };
}

export async function POST(req: NextRequest) {
  logger.info('POST request received for /api/response');

  // Check rate limit
  const rateLimitResult = checkRateLimit(req, apiCallLimiter);
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests, please try again later' },
      {
        status: 429,
        headers: rateLimitResult.headers,
      }
    );
  }

  try {
    // Try to get userId from Clerk auth (for same-domain requests)
    let userId = (await auth()).userId;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request body and validate with Zod
    const body = await req.json();
    const validation = requestBodySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          issues: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { model, content, conversationId, vars } = validation.data;

    // Get and validate model data
    const modelData = await getModelData(model);
    if (!modelData.id) {
      return NextResponse.json({ error: 'Model data not found' }, { status: 404 });
    }

    // Build payload and validate
    const body_payload = await buildBodyJson(modelData.body_config, vars, content);

    // Call custom endpoint
    const response = await callCustomEndpoint(modelData, body_payload);

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Error processing request:', error);

    // Return appropriate error status based on error type
    if (error instanceof Error) {
      const status = error.message.includes('validation')
        ? 400
        : error.message.includes('not found')
          ? 404
          : 500;
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
