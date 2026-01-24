import { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Model } from '@/lib/supabase/types';
import { useAdminModels } from '@/hooks/chat/use-models';
import { optimizedJsonStringify } from '@/utils/helpers/json-optimization';
import { MESSAGE_FORMAT_PRESETS } from '@/types/message-format';
import { WizardState, WizardStepDefinition, WizardHookReturn } from '@/types/ui/wizard.types';
import { safeJsonParse } from '../utils/pathExtractor';

export const useWizardState = (
  model: Model,
  org_id: string,
  isCreating = false,
  onModelAdded?: (model: Model) => void,
  onClose?: () => void
): WizardHookReturn => {
  const { handleUpdateModel, handleAddModel } = useAdminModels(org_id);

  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Track the model ID to detect when it changes
  const [initializedModelId, setInitializedModelId] = useState<string | null>(null);

  const [wizardState, setWizardState] = useState<WizardState>({
    // Basic Info
    nice_name: model.nice_name || '',
    description: model.description || '',
    model_id: model.model_id || '',
    schema: model.schema || '',
    endpoint: (model as any)?.endpoint || '',
    method: (model as any)?.method || 'POST',
    headersPairs: Object.entries((model.headers as Record<string, unknown>) || {}).map(
      ([k, v]) => ({
        id: uuidv4(),
        key: k,
        value: String(v),
      })
    ),
    suggestion_prompts: (model.suggestion_prompts || []).map((prompt: string) => ({
      id: uuidv4(),
      prompt,
    })),

    // AI SDK 6 Routing
    endpoint_type: (model as any)?.endpoint_type || 'webhook',
    stream_config: (model as any)?.stream_config || null,

    // Request Format
    message_format_config:
      typeof model.message_format_config === 'string'
        ? (safeJsonParse(model.message_format_config) as any) || MESSAGE_FORMAT_PRESETS.openai
        : (model.message_format_config as any) || MESSAGE_FORMAT_PRESETS.openai,
    body_config: (() => {
      // Handle body_config: it can be a JSON object (from DB), a string, null, or undefined
      const bodyConfig = model.body_config as any;

      // If it's already a string, use it directly (shouldn't happen from DB, but handle it)
      if (typeof bodyConfig === 'string') {
        try {
          // Validate it's valid JSON, if not, use default
          JSON.parse(bodyConfig);
          return bodyConfig;
        } catch {
          // Invalid JSON string, use default
        }
      }

      // If it's an object (from DB JSONB), stringify it
      if (bodyConfig && typeof bodyConfig === 'object') {
        // If it's an empty object, use default template instead
        if (Object.keys(bodyConfig).length === 0) {
          return optimizedJsonStringify(
            {
              messages: '${messages}',
              conversation_id: '${conversation_id}',
              time: '${time}',
            },
            2,
            `body_config_${model.id}`
          );
        }
        return optimizedJsonStringify(bodyConfig, 2, `body_config_${model.id}`);
      }

      // If it's null or undefined, use default
      return optimizedJsonStringify(
        {
          messages: '${messages}',
          conversation_id: '${conversation_id}',
          time: '${time}',
        },
        2,
        `body_config_${model.id}`
      );
    })(),

    // Test Variables
    testVars: {
      content: 'Hello world',
      conversation_id: 'preview',
      time: new Date().toISOString(),
      messages: optimizedJsonStringify(
        [{ role: 'user', content: 'Hello world' }],
        2,
        'test_messages'
      ),
    },

    // Test Results
    response: '',
    responseStatus: '',

    // Output Definition
    response_path: model.response_path || '',
    responseValue: '',
    responseError: '',

    // Template Tracking
    selectedTemplateId: (model as any)?.template_id || null,
    templateModifiedFields: (model as any)?.template_modified_fields || [],
    templateMode: (model as any)?.template_mode || (isCreating ? undefined : 'custom'),
  });

  // Step flow with optional Template Selection (Step 0)
  const getSteps = (): WizardStepDefinition[] => {
    const baseSteps = [
      { id: 'connection', title: 'Connection Setup', description: 'Endpoint & authentication' },
      { id: 'request', title: 'Request Configuration', description: 'How to format requests' },
      { id: 'response', title: 'Response Handling', description: 'How to parse responses' },
      { id: 'test', title: 'Test & Validate', description: 'Verify configuration' },
    ];

    // Only show template selection for new models
    if (
      isCreating &&
      (wizardState.templateMode === undefined || wizardState.templateMode === null)
    ) {
      return [
        { id: 'template', title: 'Choose Template', description: 'Select starting point' },
        ...baseSteps,
      ];
    }

    return baseSteps;
  };

  const steps = getSteps();

  // Helper function to initialize wizard state from model
  const initializeStateFromModel = useCallback(
    (model: Model): WizardState => {
      return {
        // Basic Info
        nice_name: model.nice_name || '',
        description: model.description || '',
        model_id: model.model_id || '',
        schema: model.schema || '',
        endpoint: (model as any)?.endpoint || '',
        method: (model as any)?.method || 'POST',
        headersPairs: Object.entries((model.headers as Record<string, unknown>) || {}).map(
          ([k, v]) => ({
            id: uuidv4(),
            key: k,
            value: String(v),
          })
        ),
        suggestion_prompts: (model.suggestion_prompts || []).map((prompt: string) => ({
          id: uuidv4(),
          prompt,
        })),

        // AI SDK 6 Routing
        endpoint_type: (model as any)?.endpoint_type || 'webhook',
        stream_config: (model as any)?.stream_config || null,

        // Request Format
        message_format_config:
          typeof model.message_format_config === 'string'
            ? (safeJsonParse(model.message_format_config) as any) || MESSAGE_FORMAT_PRESETS.openai
            : (model.message_format_config as any) || MESSAGE_FORMAT_PRESETS.openai,
        body_config: (() => {
          // Handle body_config: it can be a JSON object (from DB), a string, null, or undefined
          const bodyConfig = model.body_config as any;

          // If it's already a string, use it directly (shouldn't happen from DB, but handle it)
          if (typeof bodyConfig === 'string') {
            try {
              // Validate it's valid JSON, if not, use default
              JSON.parse(bodyConfig);
              return bodyConfig;
            } catch {
              // Invalid JSON string, use default
            }
          }

          // If it's an object (from DB JSONB), stringify it
          if (bodyConfig && typeof bodyConfig === 'object') {
            return optimizedJsonStringify(bodyConfig, 2, `body_config_${model.id}`);
          }

          // If it's null or undefined, use default
          return optimizedJsonStringify(
            {
              messages: '${messages}',
              conversation_id: '${conversation_id}',
              time: '${time}',
            },
            2,
            `body_config_${model.id}`
          );
        })(),

        // Test Variables
        testVars: {
          content: 'Hello world',
          conversation_id: 'preview',
          time: new Date().toISOString(),
          messages: optimizedJsonStringify(
            [{ role: 'user', content: 'Hello world' }],
            2,
            'test_messages'
          ),
        },

        // Test Results
        response: '',
        responseStatus: '',

        // Output Definition
        response_path: model.response_path || '',
        responseValue: '',
        responseError: '',

        // Template Tracking
        selectedTemplateId: (model as any)?.template_id || null,
        templateModifiedFields: (model as any)?.template_modified_fields || [],
        templateMode: (model as any)?.template_mode || (isCreating ? undefined : 'custom'),
      };
    },
    [isCreating]
  );

  // Update wizard state when model prop changes (e.g., after fetching fresh data)
  useEffect(() => {
    // Only update if this is not a new model and the model ID matches
    if (!isCreating && model.id) {
      // If this is the first time initializing, or if the model ID changed, update the state
      const isFirstInit = initializedModelId === null;
      const isModelChanged = initializedModelId !== model.id;

      if (isFirstInit || isModelChanged) {
        console.log('[useWizardState] Initializing/updating state from model:', {
          model_id: model.id,
          isFirstInit,
          isModelChanged,
          body_config: model.body_config,
          body_config_type: typeof model.body_config,
          body_config_keys:
            model.body_config && typeof model.body_config === 'object'
              ? Object.keys(model.body_config)
              : 'N/A',
        });

        const newState = initializeStateFromModel(model);
        console.log(
          '[useWizardState] Initialized body_config:',
          newState.body_config?.substring(0, 200)
        );

        setWizardState(newState);
        setInitializedModelId(model.id);
      } else {
        // Model ID is the same, but body_config might have been updated
        const newState = initializeStateFromModel(model);
        setWizardState(prev => {
          const currentBodyConfig = prev.body_config;
          const newBodyConfig = newState.body_config;

          // If body_config changed, update it
          if (currentBodyConfig !== newBodyConfig) {
            console.log('[useWizardState] body_config updated:', {
              old: currentBodyConfig?.substring(0, 100),
              new: newBodyConfig?.substring(0, 100),
            });
            return newState;
          }

          // Otherwise, just update other fields
          return {
            ...prev,
            nice_name: newState.nice_name,
            description: newState.description,
            endpoint: newState.endpoint,
            method: newState.method,
            response_path: newState.response_path,
            headersPairs: newState.headersPairs,
            endpoint_type: newState.endpoint_type,
            stream_config: newState.stream_config,
            message_format_config: newState.message_format_config,
          };
        });
      }
    }
  }, [model, isCreating, initializeStateFromModel, initializedModelId]);

  const updateState = useCallback((updates: Partial<WizardState>) => {
    setWizardState(prev => ({ ...prev, ...updates }));
  }, []);

  const next = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep, steps.length]);

  const back = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const canProceed = useCallback((): boolean => {
    const currentStepDef = steps[currentStep];
    if (!currentStepDef) return false;

    switch (currentStepDef.id) {
      case 'template': // Template Selection
        // Can proceed if user selected a template OR chose to start from scratch
        // The templateMode will be set when either action is taken
        return Boolean(wizardState.templateMode);

      case 'connection': // Connection Setup
        // Just need name and endpoint
        return Boolean(wizardState.nice_name && wizardState.endpoint);

      case 'request': // Request Configuration
        // Template validation happens in the component
        return true;

      case 'response': // Response Handling
        // Different requirements based on endpoint type
        if (wizardState.endpoint_type === 'sse') {
          const sseConfig = wizardState.stream_config as {
            contentPath?: string;
            event_mappings?: any[];
          } | null;
          return Boolean(sseConfig?.contentPath || sseConfig?.event_mappings);
        } else if (wizardState.endpoint_type === 'webhook') {
          // Only require response_path here - extraction happens in Test step
          return Boolean(wizardState.response_path);
        } else {
          // AI SDK Stream doesn't need configuration
          return true;
        }

      case 'test': // Test & Validate
        return Boolean(wizardState.responseStatus && wizardState.responseStatus.startsWith('2'));

      default:
        return false;
    }
  }, [currentStep, steps, wizardState]);

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const updatedModel: Model = {
        id: isCreating ? uuidv4() : model.id,
        model_id: wizardState.model_id || wizardState.nice_name.replace(/\s+/g, '-').toLowerCase(),
        schema: wizardState.schema,
        description: wizardState.description,
        nice_name: wizardState.nice_name,
        org_id: org_id,
        endpoint: wizardState.endpoint,
        method: wizardState.method,
        response_path: wizardState.response_path,
        created_at: new Date().toISOString(),
        headers: wizardState.headersPairs.reduce(
          (acc, { key, value }) => {
            if (key.trim() !== '') acc[key] = value;
            return acc;
          },
          {} as Record<string, string>
        ),
        body_config: (() => {
          // Parse body_config from string to object for database storage
          // body_config is stored as JSONB in the database, so it must be an object
          try {
            const parsed = safeJsonParse(wizardState.body_config, {});
            // Ensure it's an object (not null, not a primitive)
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
              // Check if it's an empty object - if so, use default template
              const keys = Object.keys(parsed);
              if (keys.length === 0) {
                console.warn('body_config is empty object, using default template');
                return {
                  messages: '${messages}',
                  conversation_id: '${conversation_id}',
                  time: '${time}',
                };
              }
              return parsed;
            }
            // If parsing resulted in something unexpected, log and use default template
            console.warn(
              'body_config parsed to unexpected type, using default template:',
              typeof parsed
            );
            return {
              messages: '${messages}',
              conversation_id: '${conversation_id}',
              time: '${time}',
            };
          } catch (error) {
            console.error('Error parsing body_config:', error);
            // Return default template as fallback
            return {
              messages: '${messages}',
              conversation_id: '${conversation_id}',
              time: '${time}',
            };
          }
        })(),
        message_format_config: wizardState.message_format_config as any,
        suggestion_prompts: wizardState.suggestion_prompts
          .map(sp => sp.prompt)
          .filter(p => p.trim() !== ''),
        // AI SDK 6 Routing
        endpoint_type: wizardState.endpoint_type,
        stream_config: wizardState.stream_config as any,
        // Template Tracking
        template_id: wizardState.selectedTemplateId,
        template_modified_fields: wizardState.templateModifiedFields,
        template_mode: wizardState.templateMode,
      } as any;

      setIsSubmitting(true);
      try {
        if (isCreating) {
          console.log('Model added:', updatedModel);
          if (onModelAdded) {
            await onModelAdded(updatedModel);
          } else {
            await handleAddModel(updatedModel);
          }
        } else {
          await handleUpdateModel(updatedModel);
          console.log('Model updated:', updatedModel);
        }

        // Close the wizard after successful save
        if (onClose) {
          onClose();
        }
      } catch (error) {
        console.error('Error saving model:', error);
        alert('Failed to save model. Please try again.');
        return;
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      wizardState,
      isCreating,
      model.id,
      org_id,
      onModelAdded,
      handleAddModel,
      handleUpdateModel,
      onClose,
    ]
  );

  return {
    state: wizardState,
    steps,
    currentStep,
    isSubmitting,
    next,
    back,
    submit,
    updateState,
    canProceed,
  };
};
