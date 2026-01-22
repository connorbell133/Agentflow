import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';

// Helper function to escape HTML entities
function escapeHtml(text: string): string {
  if (typeof document !== 'undefined') {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  return text.replace(/[&<>"']/g, (match) => {
    const escapeMap: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return escapeMap[match] || match;
  });
}

// Common validators
const safeString = z.string()
  .trim()
  .min(1, 'Required field')
  .max(255, 'Too long')
  .regex(/^[a-zA-Z0-9\s\-_.,!?'"]+$/, 'Invalid characters');

const safeTextBase = z.string()
  .trim()
  .min(1, 'Required field')
  .max(10000, 'Too long');

const safeText = safeTextBase.transform(val => DOMPurify.sanitize(val));

const email = z.string()
  .email('Invalid email')
  .toLowerCase()
  .max(255);

const url = z.string()
  .url('Invalid URL')
  .startsWith('https://', 'Must use HTTPS')
  .max(2048);

// Form schemas
export const organizationSchema = z.object({
  name: safeString
    .min(3, 'Organization name must be at least 3 characters')
    .max(50, 'Organization name too long')
    .regex(/^[a-zA-Z0-9\s-]+$/, 'Only letters, numbers, spaces, and hyphens allowed'),
  description: safeText.optional(),
});

export const profileSchema = z.object({
  fullName: safeString
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name too long'),
  email: email,
});

export const modelConfigSchema = z.object({
  nice_name: safeString,
  description: safeTextBase.max(1000).transform(val => DOMPurify.sanitize(val)),
  endpoint: url,
  headers: z.record(z.string(), z.string())
    .refine(headers => {
      // Prevent header injection
      const forbidden = ['host', 'content-length', 'transfer-encoding'];
      return !Object.keys(headers).some(h =>
        forbidden.includes(h.toLowerCase())
      );
    }, 'Forbidden headers detected'),
});

export const chatMessageSchema = z.object({
  content: z.string()
    .trim()
    .min(1, 'Message cannot be empty')
    .max(10000, 'Message too long')
    .transform(val => escapeHtml(val)),
  conversationId: z.string().uuid(),
});

// Additional schemas for other forms
export const tempOrgRequestSchema = z.object({
  orgName: safeString
    .min(3, 'Organization name must be at least 3 characters')
    .max(50, 'Organization name too long')
    .regex(/^[a-zA-Z0-9\s-]+$/, 'Only letters, numbers, spaces, and hyphens allowed'),
  reason: safeTextBase
    .min(10, 'Please provide more details (at least 10 characters)')
    .max(500, 'Reason too long')
    .transform(val => DOMPurify.sanitize(val)),
  additionalInfo: safeTextBase.max(1000).transform(val => DOMPurify.sanitize(val)).optional(),
});

// Schema for organization creation by admin
export const orgCreationSchema = z.object({
  name: organizationSchema.shape.name,
  orgOwnerEmail: email,
  orgOwnerName: safeString
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name too long'),
  status: z.enum(['Active', 'Inactive']).default('Active'),
});

// Type exports
export type OrganizationFormData = z.infer<typeof organizationSchema>;
export type ProfileFormData = z.infer<typeof profileSchema>;
export type ModelConfigFormData = z.infer<typeof modelConfigSchema>;
export type ChatMessageFormData = z.infer<typeof chatMessageSchema>;
export type TempOrgRequestFormData = z.infer<typeof tempOrgRequestSchema>;
export type OrgCreationFormData = z.infer<typeof orgCreationSchema>;