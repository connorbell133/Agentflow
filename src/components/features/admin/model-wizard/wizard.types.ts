import { Model } from "@/lib/supabase/types";
import { message_format_config } from "@/types/message-format";
import type { EndpointType, SSEStreamConfig, WebhookStreamConfig } from "@/lib/ai/router/types";

export interface WizardState {
  // Basic Info
  nice_name: string;
  description: string;
  model_id: string;
  schema: string;
  endpoint: string;
  method: 'POST' | 'GET' | 'PUT' | 'DELETE';
  headersPairs: { id: string; key: string; value: string }[];
  suggestion_prompts: { id: string; prompt: string }[];

  // AI SDK 6 Routing
  endpoint_type: EndpointType;
  stream_config: SSEStreamConfig | WebhookStreamConfig | null;

  // Request Format
  message_format_config: message_format_config;
  body_config: string;

  // Test Variables
  testVars: {
    content: string;
    conversation_id: string;
    time: string;
    messages: string
  };

  // Test Results
  response: string;
  responseStatus: string;

  // Output Definition
  response_path: string;
  responseValue: string;
  responseError: string;
}

export interface WizardStepDefinition {
  id: string;
  title: string;
  description: string;
}

export interface EditModelWizardProps {
  setActiveModel: (model: Model | null) => void;
  org_id: string;
  model: Model;
  isCreating?: boolean;
  onModelAdded?: (model: Model) => void;
}

export interface StepProps {
  state: WizardState;
  onChange: (updates: Partial<WizardState>) => void;
  onNext: () => void;
  onBack: () => void;
  canProceed: boolean;
}

export interface WizardHookReturn {
  state: WizardState;
  steps: WizardStepDefinition[];
  currentStep: number;
  isSubmitting: boolean;
  next: () => void;
  back: () => void;
  submit: (e: React.FormEvent) => Promise<void>;
  updateState: (updates: Partial<WizardState>) => void;
  canProceed: () => boolean;
}