// Message formatting configuration types

export interface RoleMapping {
    from: string; // The source role (e.g., "assistant", "user")
    to: string;   // The target role (e.g., "agent", "user")
}

export interface FieldMapping {
    source: 'role' | 'content' | 'created_at' | 'id' | 'literal';
    target: string;
    literalValue?: string;
    transform?: 'timestamp' | 'none';
    roleMapping?: RoleMapping[]; // For role field, define role transformations
}

export interface CustomField {
    name: string;
    value: string | object;
    type: 'string' | 'object' | 'array';
}

export interface message_format_config {
    mapping: Record<string, FieldMapping>;
    customFields?: CustomField[];
}

// Message formatting presets
export const MESSAGE_FORMAT_PRESETS: Record<string, message_format_config> = {
    openai: {
        mapping: {
            role: { source: 'role', target: 'role', transform: 'none' },
            content: { source: 'content', target: 'content', transform: 'none' }
        }
    },
    anthropic: {
        mapping: {
            role: { source: 'role', target: 'role', transform: 'none' },
            content: { source: 'content', target: 'content', transform: 'none' }
        }
    },
    custom: {
        mapping: {}
    }
};

