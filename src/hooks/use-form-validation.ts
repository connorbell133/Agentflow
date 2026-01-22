import { useState, useCallback } from 'react';
import { ZodSchema, ZodError } from 'zod';

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: Record<string, string>;
}

export function useFormValidation<T>(schema: ZodSchema<T>) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isValidating, setIsValidating] = useState(false);

  const validate = useCallback(async (data: unknown): Promise<ValidationResult<T>> => {
    setIsValidating(true);
    setErrors({});

    try {
      const validated = await schema.parseAsync(data);
      setIsValidating(false);
      return { success: true, data: validated };
    } catch (error) {
      if (error instanceof ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.issues.forEach(err => {
          if (err.path.length > 0) {
            const path = err.path.join('.');
            fieldErrors[path] = err.message;
          }
        });
        setErrors(fieldErrors);
        setIsValidating(false);
        return { success: false, errors: fieldErrors };
      }
      throw error;
    }
  }, [schema]);

  const clearErrors = useCallback(() => setErrors({}), []);
  
  const clearFieldError = useCallback((field: string) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  return {
    validate,
    errors,
    isValidating,
    clearErrors,
    clearFieldError,
  };
}