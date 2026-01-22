// API Response types
export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface RequestBody {
  model: string;
  content: string;
  conversationId: string;
  vars: Record<string, any>;
  messages?: Message[];
  apiKey?: string;
  customHeaders?: Record<string, string>;
}

export interface ApiResponse {
  response: string;
  responseType: string;
  success?: boolean;
  data?: any;
  error?: string;
}

export interface FormattedMessage {
  role: string;
  content: string;
}