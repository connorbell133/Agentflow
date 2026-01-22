// API Constants
export const MAX_RETRIES = 3;
export const RETRY_DELAY = 1000; // 1 second

// Cache TTLs
export const CACHE_TTL = {
  USER_GROUPS: 3 * 60 * 1000,      // 3 minutes
  GROUP_MODELS: 3 * 60 * 1000,     // 3 minutes
  MODEL_DETAILS: 5 * 60 * 1000,    // 5 minutes
  ORG_MODELS: 3 * 60 * 1000,       // 3 minutes
  CONVERSATIONS: 2 * 60 * 1000,    // 2 minutes
  ANALYTICS: 10 * 60 * 1000,       // 10 minutes
} as const;