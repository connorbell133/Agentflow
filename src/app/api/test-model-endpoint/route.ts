/**
 * Server-side proxy for testing model endpoint configurations
 *
 * This allows the model wizard to test connections to arbitrary external APIs
 * without violating CSP by making requests from the browser.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const { userId } = await auth();
    if (!userId) {
      console.error('[Test Endpoint] Unauthorized request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch (parseError: any) {
      console.error('[Test Endpoint] JSON parse error:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body', details: parseError.message },
        { status: 400 }
      );
    }

    const {
      endpoint,
      method = 'POST',
      headers: customHeaders = {},
      body: requestBody,
      stream = false,
      stream_config,
      endpoint_type,
    } = body;

    console.log('[Test Endpoint] Request:', {
      endpoint,
      method,
      hasHeaders: !!customHeaders,
      hasBody: !!requestBody,
      stream,
    });

    // Validate endpoint
    if (!endpoint || typeof endpoint !== 'string') {
      console.error('[Test Endpoint] Invalid endpoint:', endpoint);
      return NextResponse.json(
        { error: 'Invalid endpoint URL', received: endpoint },
        { status: 400 }
      );
    }

    // Validate it's a valid URL
    try {
      new URL(endpoint);
    } catch (urlError: any) {
      console.error('[Test Endpoint] Invalid URL format:', endpoint, urlError);
      return NextResponse.json(
        { error: 'Invalid URL format', endpoint, details: urlError.message },
        { status: 400 }
      );
    }

    // Make the proxied request
    const startTime = Date.now();

    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...customHeaders,
      },
    };

    if (requestBody) {
      fetchOptions.body =
        typeof requestBody === 'string' ? requestBody : JSON.stringify(requestBody);
    }

    console.log('[Test Endpoint] Making request to:', endpoint);
    console.log('[Test Endpoint] Request body:', fetchOptions.body);

    const response = await fetch(endpoint, fetchOptions);
    const responseTime = Date.now() - startTime;

    console.log('[Test Endpoint] Response status:', response.status, response.statusText);

    // For streaming responses, apply event mapping if configured
    if (stream && response.body) {
      // If stream_config is provided and endpoint is SSE, use SSEEventMapper
      if (stream_config && endpoint_type === 'sse') {
        console.log(
          '[Test Endpoint] Applying SSE event mapping with config:',
          JSON.stringify(stream_config, null, 2)
        );

        // Import SSEEventMapper
        const { SSEEventMapper } = await import('@/lib/ai/streaming/sse-event-mapper');

        // Create event mapper with config
        const mapper = new SSEEventMapper(stream_config);

        // Transform stream through mapper
        const transformedStream = response.body.pipeThrough(mapper.transform());

        return new NextResponse(transformedStream, {
          status: response.status,
          headers: {
            'Content-Type': 'text/event-stream',
            'X-Response-Time': responseTime.toString(),
            'X-Response-Status': response.status.toString(),
          },
        });
      }

      // Otherwise, pipe through without transformation
      return new NextResponse(response.body, {
        status: response.status,
        headers: {
          'Content-Type': response.headers.get('Content-Type') || 'text/event-stream',
          'X-Response-Time': responseTime.toString(),
          'X-Response-Status': response.status.toString(),
        },
      });
    }

    // For non-streaming, read and return
    const responseText = await response.text();

    console.log('[Test Endpoint] Response received, length:', responseText.length);

    return NextResponse.json({
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body: responseText,
      responseTime,
    });
  } catch (error: any) {
    console.error('[Test Endpoint Error]', error);
    console.error('[Test Endpoint Error Stack]', error.stack);

    return NextResponse.json(
      {
        error: error.message || 'Failed to test endpoint',
        details: error.toString(),
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}
