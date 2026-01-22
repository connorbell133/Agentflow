import { z } from 'zod';

/**
 * Schema for validating chat messages
 */
export const messageSchema = z.object({
  content: z.string().max(10000).trim(),
  role: z.enum(['user', 'assistant', 'system']),
});

/**
 * Schema for validating user profile input
 */
export const userProfileSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  email: z.string().email().max(255),
  bio: z.string().max(500).optional(),
});

/**
 * Schema for validating search queries
 */
export const searchQuerySchema = z.object({
  query: z.string().min(1).max(200).trim(),
  filters: z.record(z.string(), z.string()).optional(),
});

/**
 * Schema for validating HTML content
 */
export const htmlContentSchema = z.object({
  html: z.string().max(50000),
});

/**
 * Validates user input according to the message schema
 * @param input - The input to validate
 * @returns The validated and typed input
 * @throws ZodError if validation fails
 */
export const validateUserInput = (input: unknown) => {
  return messageSchema.parse(input);
};

/**
 * Validates HTML content before rendering
 * @param html - The HTML string to validate
 * @returns The validated HTML string
 * @throws ZodError if validation fails
 */
export const validateHtmlContent = (html: unknown) => {
  return htmlContentSchema.parse({ html }).html;
};

/**
 * Safe parsing function that returns a result object
 * @param schema - The Zod schema to use
 * @param data - The data to parse
 * @returns A result object with success status and data or error
 */
export const safeParse = <T>(schema: z.ZodSchema<T>, data: unknown) => {
  return schema.safeParse(data);
};