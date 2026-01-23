import { NextResponse, NextRequest } from 'next/server';
import { auth } from '@/lib/auth/server';
import { buildBodyJson } from '@/lib/api/model-utils';
import { createLogger } from '@/lib/infrastructure/logger';

const logger = createLogger('api-model');

// Helper functions
function parseMessages(variables: any): any[] {
  const { messages, content } = variables || {};

  if (messages) {
    try {
      return typeof messages === 'string' ? JSON.parse(messages) : messages;
    } catch {
      return messages;
    }
  }

  if (content) {
    return [{ role: 'user', content }];
  }

  return [{ role: 'user', content: 'Test message' }];
}

function buildTemplateVars(variables: any) {
  return {
    messages: parseMessages(variables),
    conversation_id: variables?.conversation_id ?? 'preview',
    time: new Date().toISOString(),
    content: variables?.content ?? '',
    user: variables?.user,
  };
}

async function callEndpoint(endpoint: string, headers: any, body: any, method?: string) {
  const normalizedMethod = (method || 'POST').toUpperCase();
  const hasBody = normalizedMethod !== 'GET' && normalizedMethod !== 'HEAD';

  const requestInit: RequestInit = {
    method: normalizedMethod,
    headers: hasBody ? { 'Content-Type': 'application/json', ...headers } : { ...headers },
  };

  if (hasBody && body !== undefined) {
    requestInit.body = JSON.stringify(body);
  }

  const response = await fetch(endpoint, requestInit);

  const raw = await response.text();

  if (!response.ok) {
    let errorMessage = `API error: ${response.status} ${response.statusText}`;
    let errorDetails: any = null;

    if (raw) {
      try {
        const jsonError = JSON.parse(raw);
        errorDetails = jsonError;
        const nestedMessage =
          (jsonError as any)?.error?.message ||
          (jsonError as any)?.error ||
          (jsonError as any)?.message;
        errorMessage = nestedMessage || errorMessage;
      } catch {
        errorMessage = raw || errorMessage;
        errorDetails = raw;
      }
    }

    const error: any = new Error(errorMessage);
    error.status = response.status;
    error.details = errorDetails;
    error.raw = raw;
    throw error;
  }

  // Try JSON, fall back to text
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return raw;
  }
}

export async function POST(req: NextRequest) {
  let endpoint: string | undefined;
  let method: string | undefined;
  let body_config: any;
  let variables: any;
  let bodyHeaders: any;
  try {
    // Authenticate the request
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    endpoint = payload.endpoint;
    method = payload.method || 'POST';
    bodyHeaders = payload.headers;
    body_config = payload.body_config;
    variables = payload.variables;

    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint is required' }, { status: 400 });
    }

    // Build request body
    const templateVars = buildTemplateVars(variables);
    const outgoingBody = await buildBodyJson(body_config, templateVars);

    // Call endpoint and return response
    const data = await callEndpoint(endpoint, bodyHeaders || {}, outgoingBody, method);
    return NextResponse.json(data);
  } catch (error) {
    logger.error('API error:', {
      error,
      endpoint,
      method,
      body_config,
      variables,
      bodyHeaders,
    });

    if (error instanceof Error) {
      const message = error.message;
      // Use the status from the error if available, otherwise determine based on message
      const status = (error as any).status || (message.includes('Body') ? 400 : 500);

      // Include error details if available
      const errorResponse: any = { error: message };
      if ((error as any).details) {
        errorResponse.details = (error as any).details;
      }
      if ((error as any).raw) {
        errorResponse.raw = (error as any).raw;
      }

      return NextResponse.json(errorResponse, { status });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
