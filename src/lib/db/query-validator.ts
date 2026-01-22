export function validateDateRange(days: number): number {
    const MAX_DAYS = 365;
    const MIN_DAYS = 1;

    if (isNaN(days) || days < MIN_DAYS || days > MAX_DAYS) {
        throw new Error(`Invalid date range: ${days}. Must be between ${MIN_DAYS} and ${MAX_DAYS} days.`);
    }

    return Math.floor(days);
}

export function validateorg_id(org_id: string | null | undefined): string {
    if (org_id === null || org_id === undefined || typeof org_id !== 'string' || org_id.trim().length === 0) {
        throw new Error('Invalid organization ID');
    }

    const trimmedId = org_id.trim();

    // Basic UUID validation (can be made more strict if needed)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(trimmedId)) {
        throw new Error('Invalid organization ID format');
    }

    return trimmedId;
}

export function validateSortDirection(direction: string | null | undefined): 'asc' | 'desc' {
    if (!direction) return 'asc';

    const normalized = direction.toLowerCase().trim();
    if (normalized !== 'asc' && normalized !== 'desc') {
        throw new Error('Invalid sort direction');
    }

    return normalized as 'asc' | 'desc';
}

export function validateLimit(limit: number | undefined, defaultLimit: number = 50, maxLimit: number = 1000): number {
    if (limit === undefined) return defaultLimit;

    if (isNaN(limit) || limit < 1) {
        throw new Error('Invalid limit');
    }

    if (limit > maxLimit) {
        throw new Error(`Limit exceeds maximum allowed value of ${maxLimit}`);
    }

    return Math.floor(limit);
}

export function validateOffset(offset: number | undefined): number {
    if (offset === undefined) return 0;

    if (isNaN(offset) || offset < 0) {
        throw new Error('Invalid offset');
    }

    return Math.floor(offset);
}