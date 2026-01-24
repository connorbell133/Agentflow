-- Restore system templates (model_config_presets)
-- These templates include complete field_metadata for the model wizard

-- OpenAI Chat Completions
INSERT INTO public.model_config_presets (name, description, category, event_mappings, field_metadata, is_system)
VALUES (
  'OpenAI Chat Completions',
  'Standard OpenAI Chat Completions API with streaming',
  'openai',
  '{
    "event_mappings": [
      {
        "source_event_type": "data",
        "target_ui_event": "text-delta",
        "field_mappings": {
          "delta": "choices[0].delta.content"
        }
      }
    ],
    "done_signal": "[DONE]"
  }'::jsonb,
  jsonb_build_object(
    'endpoint', jsonb_build_object(
      'state', 'PLACEHOLDER',
      'helpText', 'Your OpenAI API endpoint URL. Use https://api.openai.com/v1/chat/completions for the standard API.',
      'defaultValue', 'https://api.openai.com/v1/chat/completions',
      'validationRules', jsonb_build_object('required', true, 'type', 'url')
    ),
    'nice_name', jsonb_build_object(
      'state', 'EDITABLE',
      'helpText', 'A friendly name for this model configuration.',
      'defaultValue', 'OpenAI GPT-4',
      'validationRules', jsonb_build_object('required', true, 'minLength', 1, 'maxLength', 100)
    ),
    'model_id', jsonb_build_object(
      'state', 'EDITABLE',
      'helpText', 'The OpenAI model identifier (e.g., gpt-4, gpt-3.5-turbo).',
      'defaultValue', 'gpt-4',
      'validationRules', jsonb_build_object('required', true)
    ),
    'headersPairs.Authorization', jsonb_build_object(
      'state', 'PLACEHOLDER',
      'helpText', 'Your OpenAI API key. Format: Bearer sk-...',
      'defaultValue', 'Bearer {{OPENAI_API_KEY}}',
      'validationRules', jsonb_build_object('required', true, 'pattern', '^Bearer sk-')
    ),
    'headersPairs.Content-Type', jsonb_build_object(
      'state', 'FIXED',
      'helpText', 'Content type for JSON requests.',
      'defaultValue', 'application/json',
      'validationRules', jsonb_build_object('required', true)
    ),
    'method', jsonb_build_object(
      'state', 'FIXED',
      'helpText', 'HTTP method for OpenAI API (always POST).',
      'defaultValue', 'POST',
      'validationRules', jsonb_build_object('required', true)
    ),
    'endpoint_type', jsonb_build_object(
      'state', 'FIXED',
      'helpText', 'OpenAI uses Server-Sent Events (SSE) for streaming.',
      'defaultValue', 'sse',
      'validationRules', jsonb_build_object('required', true)
    ),
    'body_config', jsonb_build_object(
      'state', 'FIXED',
      'helpText', 'Standard OpenAI request body template. Optimized for Chat Completions API.',
      'defaultValue', '{
  "model": "${model_id}",
  "messages": "${messages}",
  "stream": true
}',
      'validationRules', jsonb_build_object('required', true, 'type', 'json')
    ),
    'stream_config.event_mappings', jsonb_build_object(
      'state', 'FIXED',
      'helpText', 'OpenAI SSE event mappings are optimized for the Chat Completions API.',
      'validationRules', jsonb_build_object('required', true)
    ),
    'stream_config.done_signal', jsonb_build_object(
      'state', 'FIXED',
      'helpText', 'OpenAI signals completion with [DONE] marker.',
      'defaultValue', '[DONE]',
      'validationRules', jsonb_build_object('required', true)
    )
  ),
  true
)
ON CONFLICT DO NOTHING;

-- OpenAI Assistants API
INSERT INTO public.model_config_presets (name, description, category, event_mappings, field_metadata, is_system)
VALUES (
  'OpenAI Assistants API',
  'OpenAI Assistants API v2 with thread-based conversations and tool calls',
  'openai',
  '{
    "event_mappings": [
      {
        "source_event_type": "thread.message.delta",
        "target_ui_event": "text-delta",
        "field_mappings": {
          "delta": "delta.content[0].text.value"
        }
      },
      {
        "source_event_type": "thread.run.step.delta",
        "when": "delta.step_details.type == ''tool_calls''",
        "target_ui_event": "tool-invocation",
        "field_mappings": {
          "toolCallId": "delta.step_details.tool_calls[0].id",
          "toolName": "delta.step_details.tool_calls[0].function.name",
          "args": "delta.step_details.tool_calls[0].function.arguments"
        }
      },
      {
        "source_event_type": "thread.run.completed",
        "target_ui_event": "finish",
        "field_mappings": {
          "finishReason": "''stop''"
        }
      }
    ],
    "done_signal": "[DONE]"
  }'::jsonb,
  jsonb_build_object(
    'endpoint', jsonb_build_object(
      'state', 'FIXED',
      'helpText', 'OpenAI Assistants API endpoint for creating thread runs.',
      'defaultValue', 'https://api.openai.com/v1/threads/runs',
      'validationRules', jsonb_build_object('required', true, 'type', 'url')
    ),
    'nice_name', jsonb_build_object(
      'state', 'EDITABLE',
      'helpText', 'A friendly name for this assistant configuration.',
      'defaultValue', 'OpenAI Assistant',
      'validationRules', jsonb_build_object('required', true, 'minLength', 1, 'maxLength', 100)
    ),
    'model_id', jsonb_build_object(
      'state', 'EDITABLE',
      'helpText', 'An identifier for this assistant (optional, for your reference).',
      'defaultValue', 'openai-assistant',
      'validationRules', jsonb_build_object('required', false)
    ),
    'description', jsonb_build_object(
      'state', 'EDITABLE',
      'helpText', 'Brief description of what this assistant does.',
      'defaultValue', 'OpenAI Assistants API with thread-based conversations and streaming responses',
      'validationRules', jsonb_build_object('required', false)
    ),
    'headersPairs.Authorization', jsonb_build_object(
      'state', 'PLACEHOLDER',
      'helpText', 'Your OpenAI API key. Format: Bearer sk-...',
      'defaultValue', 'Bearer {{OPENAI_API_KEY}}',
      'validationRules', jsonb_build_object('required', true, 'pattern', '^Bearer sk-')
    ),
    'headersPairs.OpenAI-Beta', jsonb_build_object(
      'state', 'FIXED',
      'helpText', 'Required header for Assistants API v2.',
      'defaultValue', 'assistants=v2',
      'validationRules', jsonb_build_object('required', true)
    ),
    'headersPairs.Content-Type', jsonb_build_object(
      'state', 'FIXED',
      'helpText', 'Content type for JSON requests.',
      'defaultValue', 'application/json',
      'validationRules', jsonb_build_object('required', true)
    ),
    'method', jsonb_build_object(
      'state', 'FIXED',
      'helpText', 'HTTP method for OpenAI Assistants API (always POST).',
      'defaultValue', 'POST',
      'validationRules', jsonb_build_object('required', true)
    ),
    'endpoint_type', jsonb_build_object(
      'state', 'FIXED',
      'helpText', 'OpenAI Assistants uses Server-Sent Events (SSE) for streaming.',
      'defaultValue', 'sse',
      'validationRules', jsonb_build_object('required', true)
    ),
    'body_config', jsonb_build_object(
      'state', 'EDITABLE',
      'helpText', 'OpenAI Assistants request body. You must provide your assistant_id.',
      'defaultValue', '{
  "assistant_id": "{{ASSISTANT_ID}}",
  "thread": {
    "messages": "${messages}"
  },
  "stream": true
}',
      'validationRules', jsonb_build_object('required', true, 'type', 'json')
    ),
    'stream_config.event_mappings', jsonb_build_object(
      'state', 'FIXED',
      'helpText', 'OpenAI Assistants SSE event mappings are pre-configured for thread-based streaming with tool call support.',
      'validationRules', jsonb_build_object('required', true)
    ),
    'stream_config.done_signal', jsonb_build_object(
      'state', 'FIXED',
      'helpText', 'OpenAI signals completion with [DONE] marker.',
      'defaultValue', '[DONE]',
      'validationRules', jsonb_build_object('required', true)
    )
  ),
  true
)
ON CONFLICT DO NOTHING;

-- Anthropic Claude Messages
INSERT INTO public.model_config_presets (name, description, category, event_mappings, field_metadata, is_system)
VALUES (
  'Anthropic Claude Messages',
  'Anthropic Claude Messages API with streaming',
  'anthropic',
  '{
    "event_mappings": [
      {
        "source_event_type": "content_block_delta",
        "target_ui_event": "text-delta",
        "field_mappings": {
          "delta": "delta.text"
        }
      },
      {
        "source_event_type": "message_stop",
        "target_ui_event": "finish",
        "field_mappings": {
          "finishReason": "''stop''"
        }
      }
    ],
    "done_signal": "message_stop",
    "event_type_path": "type"
  }'::jsonb,
  jsonb_build_object(
    'endpoint', jsonb_build_object(
      'state', 'PLACEHOLDER',
      'helpText', 'Your Anthropic API endpoint URL. Use https://api.anthropic.com/v1/messages for the Messages API.',
      'defaultValue', 'https://api.anthropic.com/v1/messages',
      'validationRules', jsonb_build_object('required', true, 'type', 'url')
    ),
    'nice_name', jsonb_build_object(
      'state', 'EDITABLE',
      'helpText', 'A friendly name for this model configuration.',
      'defaultValue', 'Anthropic Claude',
      'validationRules', jsonb_build_object('required', true, 'minLength', 1, 'maxLength', 100)
    ),
    'model_id', jsonb_build_object(
      'state', 'EDITABLE',
      'helpText', 'The Anthropic model identifier (e.g., claude-3-opus-20240229).',
      'defaultValue', 'claude-3-sonnet-20240229',
      'validationRules', jsonb_build_object('required', true)
    ),
    'headersPairs.x-api-key', jsonb_build_object(
      'state', 'PLACEHOLDER',
      'helpText', 'Your Anthropic API key.',
      'defaultValue', '{{ANTHROPIC_API_KEY}}',
      'validationRules', jsonb_build_object('required', true, 'pattern', '^sk-ant-')
    ),
    'headersPairs.anthropic-version', jsonb_build_object(
      'state', 'FIXED',
      'helpText', 'Anthropic API version (required header).',
      'defaultValue', '2023-06-01',
      'validationRules', jsonb_build_object('required', true)
    ),
    'headersPairs.Content-Type', jsonb_build_object(
      'state', 'FIXED',
      'helpText', 'Content type for JSON requests.',
      'defaultValue', 'application/json',
      'validationRules', jsonb_build_object('required', true)
    ),
    'method', jsonb_build_object(
      'state', 'FIXED',
      'helpText', 'HTTP method for Anthropic API (always POST).',
      'defaultValue', 'POST',
      'validationRules', jsonb_build_object('required', true)
    ),
    'endpoint_type', jsonb_build_object(
      'state', 'FIXED',
      'helpText', 'Anthropic uses Server-Sent Events (SSE) for streaming.',
      'defaultValue', 'sse',
      'validationRules', jsonb_build_object('required', true)
    ),
    'body_config', jsonb_build_object(
      'state', 'FIXED',
      'helpText', 'Standard Anthropic request body template. Optimized for Messages API.',
      'defaultValue', '{
  "model": "${model_id}",
  "messages": "${messages}",
  "stream": true,
  "max_tokens": 4096
}',
      'validationRules', jsonb_build_object('required', true, 'type', 'json')
    ),
    'stream_config.event_mappings', jsonb_build_object(
      'state', 'FIXED',
      'helpText', 'Anthropic SSE event mappings are optimized for the Messages API.',
      'validationRules', jsonb_build_object('required', true)
    ),
    'stream_config.event_type_path', jsonb_build_object(
      'state', 'FIXED',
      'helpText', 'Anthropic includes the event type in the JSON data under the "type" field.',
      'defaultValue', 'type',
      'validationRules', jsonb_build_object('required', true)
    )
  ),
  true
)
ON CONFLICT DO NOTHING;

-- Generic SSE (flexible template for custom endpoints)
INSERT INTO public.model_config_presets (name, description, category, event_mappings, field_metadata, is_system)
VALUES (
  'Generic SSE',
  'Flexible SSE streaming template for custom endpoints with configurable event mappings',
  'custom',
  '{
    "event_mappings": [
      {
        "source_event_type": "data",
        "target_ui_event": "text-delta",
        "field_mappings": {
          "delta": "choices[0].delta.content"
        }
      }
    ],
    "done_signal": "[DONE]"
  }'::jsonb,
  jsonb_build_object(
    'endpoint', jsonb_build_object(
      'state', 'PLACEHOLDER',
      'helpText', 'The URL of your SSE endpoint.',
      'defaultValue', '',
      'validationRules', jsonb_build_object('required', true, 'type', 'url')
    ),
    'nice_name', jsonb_build_object(
      'state', 'PLACEHOLDER',
      'helpText', 'A friendly name for this model configuration.',
      'defaultValue', '',
      'validationRules', jsonb_build_object('required', true, 'minLength', 1, 'maxLength', 100)
    ),
    'model_id', jsonb_build_object(
      'state', 'EDITABLE',
      'helpText', 'Optional model identifier.',
      'defaultValue', '',
      'validationRules', jsonb_build_object('required', false)
    ),
    'method', jsonb_build_object(
      'state', 'EDITABLE',
      'helpText', 'HTTP method for your endpoint.',
      'defaultValue', 'POST',
      'validationRules', jsonb_build_object('required', true)
    ),
    'endpoint_type', jsonb_build_object(
      'state', 'FIXED',
      'helpText', 'This template is for Server-Sent Events (SSE) endpoints.',
      'defaultValue', 'sse',
      'validationRules', jsonb_build_object('required', true)
    ),
    'body_config', jsonb_build_object(
      'state', 'EDITABLE',
      'helpText', 'Define your request body template with variable substitution.',
      'defaultValue', '{
  "messages": "${messages}"
}',
      'validationRules', jsonb_build_object('required', true, 'type', 'json')
    ),
    'stream_config.event_mappings', jsonb_build_object(
      'state', 'EDITABLE',
      'helpText', 'Event mappings define how SSE events are transformed to UI events. You can customize source events, target UI events, and field mappings.',
      'validationRules', jsonb_build_object('required', true, 'type', 'array')
    ),
    'stream_config.done_signal', jsonb_build_object(
      'state', 'EDITABLE',
      'helpText', 'Signal that indicates the stream is complete (can be a data value or event type).',
      'defaultValue', '[DONE]',
      'validationRules', jsonb_build_object('required', false)
    ),
    'stream_config.error_path', jsonb_build_object(
      'state', 'EDITABLE',
      'helpText', 'JSONPath to extract error messages from error events (e.g., error.message).',
      'defaultValue', '',
      'validationRules', jsonb_build_object('required', false)
    )
  ),
  true
)
ON CONFLICT DO NOTHING;
