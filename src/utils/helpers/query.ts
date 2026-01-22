
export const trackQuery = (queryName: string, startTime: number) => {
  const duration = Date.now() - startTime;
  if (process.env.NODE_ENV === 'development' && process.env.DEBUG_QUERIES === 'true') {
    console.log(`Query ${queryName} took ${duration}ms`);
  }
  // In production, send to monitoring service
  return duration;
};

// Track slow queries
export const trackSlowQuery = (queryName: string, duration: number, threshold: number = 1000) => {
  if (duration > threshold) {
    console.warn(`Slow query detected: ${queryName} took ${duration}ms`);
    // In production, send alert to monitoring service
  }
};

// Helper to wrap queries with performance tracking
export const withQueryTracking = async <T>(
  queryName: string,
  queryFunction: () => Promise<T>
): Promise<T> => {
  const startTime = Date.now();
  try {
    const result = await queryFunction();
    const duration = trackQuery(queryName, startTime);
    trackSlowQuery(queryName, duration);
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`Query ${queryName} failed after ${duration}ms:`, error);
    throw error;
  }
};