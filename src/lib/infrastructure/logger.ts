// logger.ts

// List of sensitive keys that should be redacted from logs
const SENSITIVE_KEYS = ['password', 'token', 'secret', 'key', 'authorization', 'cookie', 'session'];

/**
 * Sanitizes sensitive data from objects before logging
 * @param data - The data to sanitize
 * @returns The sanitized data with sensitive values replaced with [REDACTED]
 */
function sanitizeData(data: any): any {
    if (!data) return data;

    // Handle string values that might contain sensitive data
    if (typeof data === 'string') {
        // Check if string might contain sensitive data
        const lowerStr = data.toLowerCase();
        if (SENSITIVE_KEYS.some(key => lowerStr.includes(key))) {
            return '[REDACTED]';
        }
        return data;
    }

    // Handle arrays recursively
    if (Array.isArray(data)) {
        return data.map(item => sanitizeData(item));
    }

    // Handle objects
    if (typeof data === 'object') {
        const sanitized: any = {};
        for (const [key, value] of Object.entries(data)) {
            const lowerKey = key.toLowerCase();
            // Check if the key name contains any sensitive keywords
            if (SENSITIVE_KEYS.some(sensitive => lowerKey.includes(sensitive))) {
                sanitized[key] = '[REDACTED]';
            } else {
                sanitized[key] = sanitizeData(value);
            }
        }
        return sanitized;
    }

    // Return primitive types as-is (numbers, booleans, null, etc.)
    return data;
}

export const createLogger = (fileName: string) => {
    // Check environment variables for logging configuration
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isDebugEnabled = process.env.NEXT_PUBLIC_DEBUG === 'true' || process.env.DEBUG === 'true';

    const formatMessage = (level: string, message: string, data?: any) => {
        const sanitizedData = sanitizeData(data);
        const formattedMessage = `[${level}] [${fileName}] ${message}`;
        if (sanitizedData) {
            return `${formattedMessage} | Data: ${JSON.stringify(sanitizedData)}`;
        }
        return formattedMessage;
    };

    return {
        info: (message: string, data?: any) => {
            if (isDevelopment && isDebugEnabled) {
                console.log(formatMessage("INFO", message, data));
            }
        },
        warn: (message: string, data?: any) => {
            if (isDevelopment && isDebugEnabled) {
                console.warn(formatMessage("WARN", message, data));
            }
        },
        error: (message: string, data?: any) => {
            // Always log errors in development, only log in production if explicitly enabled
            if (isDevelopment || process.env.NEXT_PUBLIC_LOG_ERRORS === 'true') {
                console.error(formatMessage("ERROR", message, data));
            }
        },
        debug: (message: string, data?: any) => {
            if (isDevelopment && isDebugEnabled) {
                console.debug(formatMessage("DEBUG", message, data));
            }
        },
    };
};
