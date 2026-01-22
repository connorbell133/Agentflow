interface PerformanceMetrics {
    startTime: number;
    endTime?: number;
    duration?: number;
    label: string;
}

interface WebVitalMetrics {
    FCP?: number;
    LCP?: number;
    FID?: number;
    CLS?: number;
    TTFB?: number;
    INP?: number;
}

class PerformanceMonitor {
    private metrics: Map<string, PerformanceMetrics> = new Map();
    private webVitals: WebVitalMetrics = {};
    private analyticsCallback?: (metric: any) => void;

    constructor() {
        if (typeof window !== 'undefined') {
            this.initializeWebVitalsTracking();
        }
    }

    // Set analytics callback for reporting metrics
    setAnalyticsCallback(callback: (metric: any) => void) {
        this.analyticsCallback = callback;
    }

    startTimer(label: string) {
        this.metrics.set(label, {
            startTime: performance.now(),
            label,
        });
    }

    endTimer(label: string) {
        const metric = this.metrics.get(label);
        if (!metric) {
            console.warn(`Performance metric "${label}" not found`);
            return;
        }

        const endTime = performance.now();
        const duration = endTime - metric.startTime;

        this.metrics.set(label, {
            ...metric,
            endTime,
            duration,
        });

        // Log if duration exceeds threshold
        if (duration > 1000) {
            console.warn(`Slow operation detected: ${label} took ${duration.toFixed(2)}ms`);
        }

        // Report to analytics if callback is set
        if (this.analyticsCallback) {
            this.analyticsCallback({
                type: 'timer',
                label,
                duration,
                timestamp: new Date().toISOString()
            });
        }

        return duration;
    }

    getMetrics(label?: string) {
        if (label) {
            return this.metrics.get(label);
        }
        return Array.from(this.metrics.values());
    }

    clearMetrics() {
        this.metrics.clear();
    }

    // Helper to measure async operations
    async measureAsync<T>(label: string, operation: () => Promise<T>): Promise<T> {
        this.startTimer(label);
        try {
            const result = await operation();
            this.endTimer(label);
            return result;
        } catch (error) {
            this.endTimer(label);
            throw error;
        }
    }

    // Initialize Core Web Vitals tracking
    private initializeWebVitalsTracking() {
        // Track First Contentful Paint (FCP)
        const fcpObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                if (entry.name === 'first-contentful-paint') {
                    this.webVitals.FCP = entry.startTime;
                    this.reportWebVital('FCP', entry.startTime);
                }
            }
        });
        fcpObserver.observe({ entryTypes: ['paint'] });

        // Track Largest Contentful Paint (LCP)
        const lcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            this.webVitals.LCP = lastEntry.startTime;
            this.reportWebVital('LCP', lastEntry.startTime);
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

        // Track First Input Delay (FID) / Interaction to Next Paint (INP)
        const fidObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                if (entry.entryType === 'first-input') {
                    const fid = (entry as any).processingStart - entry.startTime;
                    this.webVitals.FID = fid;
                    this.reportWebVital('FID', fid);
                }
            }
        });
        fidObserver.observe({ entryTypes: ['first-input'] });

        // Track Cumulative Layout Shift (CLS)
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                if (!(entry as any).hadRecentInput) {
                    clsValue += (entry as any).value;
                    this.webVitals.CLS = clsValue;
                    this.reportWebVital('CLS', clsValue);
                }
            }
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });

        // Track Time to First Byte (TTFB)
        if ('PerformanceNavigationTiming' in window) {
            const navTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
            if (navTiming) {
                const ttfb = navTiming.responseStart - navTiming.fetchStart;
                this.webVitals.TTFB = ttfb;
                this.reportWebVital('TTFB', ttfb);
            }
        }
    }

    // Report web vital to analytics
    private reportWebVital(name: string, value: number) {
        console.log(`Web Vital - ${name}: ${value.toFixed(2)}ms`);
        
        if (this.analyticsCallback) {
            this.analyticsCallback({
                type: 'webvital',
                name,
                value,
                timestamp: new Date().toISOString()
            });
        }
    }

    // Get current web vitals
    getWebVitals(): WebVitalMetrics {
        return { ...this.webVitals };
    }

    // Mark a custom performance event
    mark(name: string) {
        if (performance.mark) {
            performance.mark(name);
        }
    }

    // Measure between two marks
    measure(name: string, startMark: string, endMark: string) {
        if (performance.measure) {
            try {
                performance.measure(name, startMark, endMark);
                const measures = performance.getEntriesByName(name, 'measure');
                if (measures.length > 0) {
                    const duration = measures[measures.length - 1].duration;
                    this.reportWebVital(name, duration);
                    return duration;
                }
            } catch (error) {
                console.warn(`Failed to measure ${name}:`, error);
            }
        }
        return null;
    }

    // Log all performance entries (for debugging)
    logAllEntries() {
        const entries = performance.getEntries();
        console.table(entries.map(entry => ({
            name: entry.name,
            type: entry.entryType,
            startTime: entry.startTime.toFixed(2),
            duration: entry.duration.toFixed(2)
        })));
    }
}

export const performanceMonitor = new PerformanceMonitor();

// Export utility function for tracking Core Web Vitals
export const trackCoreWebVitals = (analyticsCallback?: (metric: any) => void) => {
    if (analyticsCallback) {
        performanceMonitor.setAnalyticsCallback(analyticsCallback);
    }
    
    // Return current web vitals
    return performanceMonitor.getWebVitals();
};