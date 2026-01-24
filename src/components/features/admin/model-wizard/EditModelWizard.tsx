import React, { useState, useEffect, useCallback } from 'react';
import { Model } from '@/lib/supabase/types';
import { useWizardState } from './hooks/useWizardState';
import { useModelValidation } from './hooks/useModelValidation';
import { useEndpointTesting } from './hooks/useEndpointTesting';
import { WizardContainer } from './components/WizardContainer';
import { WizardStepper } from './components/WizardStepper';
import { WizardStepContent } from './components/WizardStepContent';
import { FieldStateProvider } from './context/FieldStateContext';
import { getAllAvailablePresets, getPresetById } from '@/actions/chat/presets';
import { getModelData } from '@/actions/chat/models';
import type { ModelConfigPreset } from '@/types/event-mapping';
import type { TemplateFieldMetadataMap } from '@/types/template-field-state';

interface EditModelWizardProps {
  setActiveModel: (model: Model | null) => void;
  org_id: string;
  model: Model;
  isCreating?: boolean;
  onModelAdded?: (model: Model) => void;
}

const EditModelWizard: React.FC<EditModelWizardProps> = ({
  setActiveModel,
  org_id,
  model,
  isCreating = false,
  onModelAdded,
}) => {
  const [templates, setTemplates] = useState<ModelConfigPreset[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ModelConfigPreset | null>(null);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [currentModel, setCurrentModel] = useState<Model>(model);
  const [isLoadingModel, setIsLoadingModel] = useState(!isCreating);

  // Fetch fresh model data when wizard opens (for editing existing models)
  useEffect(() => {
    if (!isCreating && model.id) {
      const fetchFreshModel = async () => {
        try {
          setIsLoadingModel(true);
          const freshModel = await getModelData(model.id);
          if (freshModel) {
            console.log('[EditModelWizard] Fresh model loaded:', {
              id: freshModel.id,
              body_config: freshModel.body_config,
              body_config_type: typeof freshModel.body_config,
              body_config_keys:
                freshModel.body_config && typeof freshModel.body_config === 'object'
                  ? Object.keys(freshModel.body_config)
                  : 'N/A',
            });
            setCurrentModel(freshModel);
          }
        } catch (error) {
          console.error('Error fetching fresh model data:', error);
          // Fall back to the model prop if fetch fails
        } finally {
          setIsLoadingModel(false);
        }
      };
      fetchFreshModel();
    } else {
      setIsLoadingModel(false);
    }
  }, [model.id, isCreating]);

  const handleClose = () => {
    setActiveModel(null);
  };

  const wizard = useWizardState(currentModel, org_id, isCreating, onModelAdded, handleClose);
  const validation = useModelValidation(wizard.state);
  const endpointTesting = useEndpointTesting();

  // Load templates on mount
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        setIsLoadingTemplates(true);
        const presets = await getAllAvailablePresets(org_id);
        setTemplates(presets);

        // If editing an existing model with a template, load it
        if (!isCreating && (model as any)?.template_id) {
          const template = await getPresetById((model as any).template_id);
          if (template) {
            setSelectedTemplate(template);
          }
        }
      } catch (error) {
        console.error('Error loading templates:', error);
      } finally {
        setIsLoadingTemplates(false);
      }
    };

    loadTemplates();
  }, [org_id, isCreating, model]);

  // Handle template selection
  const handleTemplateSelect = useCallback(
    async (templateId: string | null) => {
      if (templateId) {
        try {
          const template = await getPresetById(templateId);
          if (template) {
            setSelectedTemplate(template);

            // Apply template defaults to wizard state
            if (template.field_metadata) {
              const defaults = extractTemplateDefaults(template.field_metadata);

              // Also apply the event_mappings from the template to stream_config
              if (template.event_mappings) {
                defaults.stream_config = template.event_mappings;
              }

              wizard.updateState(defaults);
            }
          }
        } catch (error) {
          console.error('Error loading template:', error);
        }
      } else {
        setSelectedTemplate(null);
      }
    },
    [wizard]
  );

  const handleExit = () => {
    const confirmClose = window.confirm('Discard your changes?');
    if (!confirmClose) return;
    setActiveModel(null);
  };

  const canProceed = (): boolean => {
    const currentStepDef = wizard.steps[wizard.currentStep];
    if (!currentStepDef) return false;

    switch (currentStepDef.id) {
      case 'template': // Template Selection
        return Boolean(wizard.state.templateMode);

      case 'connection': // Connection Setup
        return Boolean(wizard.state.nice_name && wizard.state.endpoint);

      case 'request': // Request Configuration
        return validation.isValid;

      case 'response': // Response Handling
        if (wizard.state.endpoint_type === 'sse') {
          const sseConfig = wizard.state.stream_config as any;
          return Boolean(sseConfig?.contentPath || sseConfig?.event_mappings);
        } else if (wizard.state.endpoint_type === 'webhook') {
          // Only require response_path here - extraction happens in Test step
          return Boolean(wizard.state.response_path);
        } else {
          return true; // AI SDK Stream needs no config
        }

      case 'test': // Test & Validate
        return Boolean(wizard.state.responseStatus && wizard.state.responseStatus.startsWith('2'));

      default:
        return false;
    }
  };

  return (
    <FieldStateProvider
      wizardState={wizard.state}
      templateFieldMetadata={selectedTemplate?.field_metadata}
    >
      <WizardContainer onExit={handleExit}>
        <form
          onSubmit={e => {
            // Only submit if we're on the last step (test step)
            if (wizard.currentStep === wizard.steps.length - 1) {
              wizard.submit(e);
            } else {
              // Prevent form submission when not on last step
              e.preventDefault();
              e.stopPropagation();
            }
          }}
          className="flex h-full w-full"
        >
          <WizardStepper
            steps={wizard.steps}
            currentStep={wizard.currentStep}
            canProceed={canProceed()}
            isSubmitting={wizard.isSubmitting}
            isCreating={isCreating}
            onNext={wizard.next}
            onBack={wizard.back}
            onExit={handleExit}
          />

          <WizardStepContent
            steps={wizard.steps}
            currentStep={wizard.currentStep}
            state={wizard.state}
            updateState={wizard.updateState}
            validation={validation}
            endpointTesting={endpointTesting}
            templates={templates}
            onTemplateSelect={handleTemplateSelect}
            isLoadingTemplates={isLoadingTemplates}
          />
        </form>
      </WizardContainer>
    </FieldStateProvider>
  );
};

// Helper function to extract default values from template field metadata
function extractTemplateDefaults(fieldMetadata: TemplateFieldMetadataMap): Partial<any> {
  const defaults: any = {};

  // Separate headersPairs for special handling
  const headersPairsMap: Record<string, string> = {};

  for (const [fieldPath, metadata] of Object.entries(fieldMetadata)) {
    if (metadata.defaultValue !== undefined) {
      // Special handling for headersPairs - these are stored as "headersPairs.HeaderName"
      if (fieldPath.startsWith('headersPairs.')) {
        const headerKey = fieldPath.substring('headersPairs.'.length);
        headersPairsMap[headerKey] = metadata.defaultValue;
      } else {
        setNestedValue(defaults, fieldPath, metadata.defaultValue);
      }
    }
  }

  // Convert headersPairs map to array format
  if (Object.keys(headersPairsMap).length > 0) {
    defaults.headersPairs = Object.entries(headersPairsMap).map(([key, value]) => ({
      id: `header-${key.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      key,
      value,
    }));
  }

  return defaults;
}

// Helper to set nested object values using dot notation
function setNestedValue(obj: any, path: string, value: any) {
  const keys = path.split('.');
  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!current[key]) {
      current[key] = {};
    }
    current = current[key];
  }

  current[keys[keys.length - 1]] = value;
}

export default EditModelWizard;
