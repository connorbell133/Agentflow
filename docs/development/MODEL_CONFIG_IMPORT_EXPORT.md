# Model Configuration Import/Export

## Overview

The platform now supports importing and exporting AI model configurations as YAML files. This enables easy sharing of model setups between organizations and simplifies model configuration.

## Features

### Export Model Configuration
- Export any model as a YAML file
- Optionally include API keys (masked by default)
- Download ready-to-share configuration files
- Filename format: `{model-name}-config-{date}.yaml`

### Import Model Configuration
- Upload YAML configuration files
- Automatic validation before import
- Preview configuration details
- Option to replace existing models
- Support for drag-and-drop file upload

## Usage

### Exporting a Model

1. Navigate to the **Admin Dashboard** → **Models** tab
2. Hover over the model card you want to export
3. Click the **Download** icon (appears on hover)
4. The YAML file will be automatically downloaded

### Importing a Model

1. Navigate to the **Admin Dashboard** → **Models** tab
2. Click the **Import** button in the top-right corner
3. Either:
   - Drag and drop a YAML file into the upload area, or
   - Click to browse and select a YAML file
4. Click **Validate** to check the configuration
5. Review any validation errors (if present)
6. Click **Import Model** to create the model
7. The new model will appear in your models list

### Import Options

- **Replace if model with same name exists**: Enable this to update an existing model instead of creating a duplicate
- **Import API key (if present in config)**: Include the API key from the YAML file (currently not implemented - keys must be added manually)

## YAML Configuration Format

```yaml
name: "Claude Sonnet"
model_id: "claude-3-sonnet-20240229"
description: "large model for reasoning"
endpoint: "https://api.anthropic.com/v1/messages"
method: "POST"

headers:
  x-api-key:
  anthropic-version:
  Content-Type:

request_schema:
  model: "claude-3-sonnet-20240229"
  messages:
    - role: "user"
      content: "{{message}}"
  max_tokens: 4096

response_path: "content[0].text"

message_format:
  preset: "openai"
  mapping:
    role:
      source: "role"
      target: "role"
      transform: "none"
      roleMapping: []
    content:
      source: "content"
      target: "content"
      transform: "none"

suggestion_prompts:
  - "Tell me a story about dogs."
```

## Security Considerations

### Sensitive Data Handling

- **API Keys**: Never included in exports
- **Header Values**: Only header **keys** are exported, values are omitted for security
- **Import**: After importing, you must manually add:
  - API keys
  - Header values (authentication tokens, API versions, etc.)

### Validation

- All imported configurations are validated against a strict schema
- Invalid configurations are rejected with detailed error messages
- Only administrators can import/export models

## Testing

A sample configuration file is available at `test-model-config.yaml` in the project root. Use this to test the import functionality:

1. Start the development server: `npm run dev`
2. Navigate to Admin → Models
3. Click Import and upload `test-model-config.yaml`
4. Validate and import the configuration

## Technical Details

### File Locations

- **Types**: `src/types/model-config.ts`
- **Utilities**: `src/utils/model-config/`
  - `yaml-serializer.ts` - Export logic
  - `yaml-parser.ts` - Import and validation logic
  - `model-mapper.ts` - Data transformation
- **Server Actions**: `src/actions/chat/model-configs.ts`
- **UI Components**:
  - `src/components/features/admin/modals/ImportModelModal.tsx`
  - `src/components/features/admin/management/ModelCard.tsx` (export button)
  - `src/components/features/admin/tabs/Models.tsx` (import button)

### Validation Schema

The YAML configuration is validated using Zod schemas defined in `src/types/model-config.ts`. Key validations include:

- Required fields: `name`, `endpoint`, `request_schema`, `response_path`, `message_format`
- URL validation for `endpoint`
- Valid HTTP method
- Non-empty request schema
- Valid message format structure

### Dependencies

- **js-yaml** (^4.1.0) - YAML parsing and serialization
- **@types/js-yaml** (^4.0.9) - TypeScript type definitions

## Troubleshooting

### Import Fails

- **Validation errors**: Review the error messages and ensure your YAML matches the required format
- **Duplicate model name**: Enable "Replace if exists" option or rename the model in the YAML file
- **Invalid YAML syntax**: Validate your YAML file with a YAML validator

### Export Doesn't Work

- Check browser console for errors
- Ensure you have permission to access the model
- Verify the model exists in the database

### Missing API Key After Import

API key import is not yet implemented. After importing a model:
1. Edit the model
2. Navigate to the API key section
3. Add the key manually

## Future Enhancements

- [ ] API key import functionality
- [ ] Batch import/export of multiple models
- [ ] Template library with pre-configured models
- [ ] Import from URL
- [ ] Export with custom formatting options
- [ ] Version tracking for configurations
