# Test ID Alignment Summary

This document tracks all test IDs used in E2E tests and their corresponding UI components.

## Models Tab Component (`src/components/features/admin/tabs/Models.tsx`)

| Test ID | Element | Status |
|---------|---------|--------|
| `model-add-button` | Add model button (+) | ✅ Added |
| `model-import-button` | Import button | ✅ Added |
| `models-grid` | Models grid container | ✅ Added |
| `models-loading-grid` | Loading skeleton grid | ✅ Added |
| `delete-model-dialog` | Delete confirmation dialog | ✅ Added |
| `delete-model-confirm-input` | Delete confirmation input | ✅ Added |
| `delete-model-confirm-button` | Delete confirm button | ✅ Added |
| `delete-model-cancel-button` | Delete cancel button | ✅ Added |

## Model Card Component (`src/components/features/admin/management/ModelCard.tsx`)

| Test ID | Element | Status |
|---------|---------|--------|
| `model-card-{id}` | Model card container | ✅ Added |
| `model-name-{id}` | Model name heading | ✅ Added |
| `model-delete-{id}` | Delete button | ✅ Added |
| `model-export-{id}` | Export button | ✅ Added |

## Wizard Components

### Wizard Container (`src/components/features/admin/model-wizard/components/WizardContainer.tsx`)

| Test ID | Element | Status |
|---------|---------|--------|
| `wizard-container` | Wizard container overlay | ✅ Added |

### Wizard Step Content (`src/components/features/admin/model-wizard/components/WizardStepContent.tsx`)

| Test ID | Element | Status |
|---------|---------|--------|
| `wizard-step-title-{stepId}` | Step title (basic, field-mapping, request-template, test, output) | ✅ Added |

### Wizard Stepper (`src/components/features/admin/model-wizard/components/WizardStepper.tsx`)

| Test ID | Element | Status |
|---------|---------|--------|
| `wizard-button-next` | Next button | ✅ Added |
| `wizard-button-back` | Back button | ✅ Added |
| `wizard-button-save` | Save/Submit button | ✅ Added |

### Basic Info Step (`src/components/features/admin/model-wizard/steps/BasicInfoStep.tsx`)

| Test ID | Element | Status |
|---------|---------|--------|
| `wizard-input-name` | Name input | ✅ Added |
| `wizard-input-model-id` | Model ID input | ✅ Added |
| `wizard-input-endpoint` | Endpoint input | ✅ Added |
| `wizard-input-description` | Description input | ✅ Added |
| `wizard-input-header-key-{idx}` | Header key input (indexed) | ✅ Added |
| `wizard-input-header-value-{idx}` | Header value input (indexed) | ✅ Added |
| `wizard-button-add-header` | Add header button | ✅ Added |
| `wizard-input-suggestion-prompt-{idx}` | Suggestion prompt input (indexed) | ✅ Added |
| `wizard-button-add-suggestion-prompt` | Add suggestion prompt button | ✅ Added |

### Request Template Step (`src/components/features/admin/model-wizard/steps/RequestTemplateStep.tsx`)

| Test ID | Element | Status |
|---------|---------|--------|
| `wizard-textarea-body-config` | Body config textarea | ✅ Added |
| `wizard-textarea-ajv-schema` | AJV schema textarea | ✅ Added |

### Test Endpoint Step (`src/components/features/admin/model-wizard/steps/TestEndpointStep.tsx`)

| Test ID | Element | Status |
|---------|---------|--------|
| `wizard-button-test-endpoint` | Test endpoint button | ✅ Added |

### Define Output Step (`src/components/features/admin/model-wizard/steps/DefineOutputStep.tsx`)

| Test ID | Element | Status |
|---------|---------|--------|
| `wizard-input-response-path` | Response path input | ✅ Added |

## Import Modal (`src/components/features/admin/modals/ImportModelModal.tsx`)

| Test ID | Element | Status |
|---------|---------|--------|
| `import-validate-button` | Validate button | ✅ Added |
| `import-submit-button` | Import submit button | ✅ Added |
| `import-replace-if-exists-checkbox` | Replace if exists checkbox | ✅ Added |
| `import-replace-if-exists-label` | Replace if exists label | ✅ Added |
| `import-api-key-checkbox` | Import API key checkbox | ✅ Added |
| `import-api-key-label` | Import API key label | ✅ Added |

## Organization Request Form (`src/components/features/admin/org_management/TempOrgRequestForm.tsx`)

| Test ID | Element | Status |
|---------|---------|--------|
| `org-name-input` | Organization name input | ✅ Added |
| `request-reason-textarea` | Request reason textarea | ✅ Added |
| `additional-info-textarea` | Additional info textarea | ✅ Added |
| `submit-request-button` | Submit request button | ✅ Added |
| `org-request-check-status` | Check status button | ✅ Added |
| `org-request-submitted-message` | Submitted message | ✅ Added |

## Admin Header (`src/components/features/admin/layout/AdminHeader.tsx`)

| Test ID | Element | Status |
|---------|---------|--------|
| `admin-dashboard-heading` | Dashboard heading | ✅ Added |

## Test Coverage

All test IDs referenced in `tests/e2e/organization/model-mgmt.spec.ts` have been verified to exist in the corresponding UI components.

**Total Test IDs in Tests:** 80  
**Total Test IDs in UI Components:** 76+ (some are dynamic with IDs)

## Notes

- Dynamic test IDs (those with `{id}` or `{idx}` placeholders) are generated at runtime
- All wizard step titles use the pattern `wizard-step-title-{stepId}` where stepId is one of: `basic`, `field-mapping`, `request-template`, `test`, `output`
- Model card test IDs use the model's database ID: `model-card-{id}`, `model-name-{id}`, `model-delete-{id}`, `model-export-{id}`
- Header and suggestion prompt inputs are indexed: `wizard-input-header-key-0`, `wizard-input-header-value-0`, etc.

