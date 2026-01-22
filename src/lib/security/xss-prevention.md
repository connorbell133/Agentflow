# XSS Prevention Guidelines

## Overview
This document outlines the security measures and best practices implemented to prevent Cross-Site Scripting (XSS) attacks in the chat platform.

## Core Principles

1. **Never use dangerouslySetInnerHTML without sanitization**
   - All HTML content must be sanitized using the `sanitizeHtml` function from `/src/lib/security/sanitize.ts`
   - Components that render HTML should use the sanitized content

2. **Always validate and sanitize user input**
   - Use the validation schemas from `/src/lib/security/validation.ts`
   - Apply sanitization functions before storing or displaying user content

3. **Use parameterized queries for database operations**
   - Never concatenate user input directly into SQL queries
   - Use prepared statements and parameterized queries

4. **Escape HTML entities in dynamic content**
   - Use the `escapeHtml` function for content that should not contain HTML
   - Apply `sanitizeUserInput` for general user input sanitization

5. **Implement Content Security Policy**
   - Configure appropriate CSP headers to restrict resource loading
   - Limit inline scripts and styles

## Implementation Details

### Sanitization Functions

- **`sanitizeHtml(dirty: string)`**: Sanitizes HTML content using DOMPurify with a whitelist of allowed tags and attributes
- **`escapeHtml(unsafe: string)`**: Escapes HTML entities to prevent injection
- **`sanitizeUserInput(input: string)`**: Combines escaping and pattern removal for user input

### Validation Schemas

- **`messageSchema`**: Validates chat message structure and content
- **`userProfileSchema`**: Validates user profile data
- **`searchQuerySchema`**: Validates search input
- **`htmlContentSchema`**: Validates HTML content before rendering

### Safe Components

1. **HtmlContent Component**: Now uses `sanitizeHtml` before rendering
2. **MarkdownContent Component**: Sanitizes markdown input before processing
3. **ThemeScript Component**: Contains only static, controlled scripts
4. **Chart Component**: Uses controlled CSS injection for styling

## Developer Guidelines

1. **When handling user input:**
   - Always validate against a schema
   - Apply appropriate sanitization
   - Never trust client-side validation alone

2. **When rendering dynamic content:**
   - Use React's default escaping for text content
   - Apply sanitization for HTML content
   - Use controlled components for forms

3. **When using dangerouslySetInnerHTML:**
   - Document why it's necessary
   - Always sanitize the content first
   - Add comments explaining the safety measures

4. **Regular Security Audits:**
   - Search for `dangerouslySetInnerHTML` usage
   - Review all user input handling
   - Check for proper validation implementation

## Testing XSS Prevention

1. Test with common XSS payloads:
   - `<script>alert('XSS')</script>`
   - `<img src=x onerror=alert('XSS')>`
   - `javascript:alert('XSS')`

2. Verify sanitization in:
   - Chat messages
   - User profiles
   - HTML content rendering
   - Form submissions

## Incident Response

If an XSS vulnerability is discovered:
1. Immediately patch the vulnerability
2. Audit similar code patterns
3. Update this documentation
4. Notify the security team
5. Review logs for exploitation attempts