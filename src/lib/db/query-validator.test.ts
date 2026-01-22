import { 
    validateDateRange, 
    validateOrgId, 
    validateSortDirection, 
    validateLimit, 
    validateOffset 
} from '@/lib/db/query-validator';

describe('Query Validator - SQL Injection Prevention', () => {
    describe('validateDateRange', () => {
        it('should accept valid date ranges', () => {
            expect(validateDateRange(30)).toBe(30);
            expect(validateDateRange(1)).toBe(1);
            expect(validateDateRange(365)).toBe(365);
        });

        it('should reject invalid date ranges', () => {
            expect(() => validateDateRange(0)).toThrow('Invalid date range');
            expect(() => validateDateRange(-1)).toThrow('Invalid date range');
            expect(() => validateDateRange(366)).toThrow('Invalid date range');
            expect(() => validateDateRange(NaN)).toThrow('Invalid date range');
            expect(() => validateDateRange(Infinity)).toThrow('Invalid date range');
        });

        it('should floor decimal values', () => {
            expect(validateDateRange(30.7)).toBe(30);
            expect(validateDateRange(1.1)).toBe(1);
        });

        it('should reject SQL injection attempts', () => {
            // These would be converted to NaN when passed as number
            const sqlInjectionPayload = "30; DROP TABLE users;--" as any;
            expect(() => validateDateRange(Number(sqlInjectionPayload))).toThrow('Invalid date range');
        });
    });

    describe('validateOrgId', () => {
        it('should accept valid UUID formats', () => {
            const validUuid = '123e4567-e89b-12d3-a456-426614174000';
            expect(validateOrgId(validUuid)).toBe(validUuid);
        });

        it('should reject invalid org IDs', () => {
            expect(() => validateOrgId(null)).toThrow('Invalid organization ID');
            expect(() => validateOrgId(undefined)).toThrow('Invalid organization ID');
            expect(() => validateOrgId('')).toThrow('Invalid organization ID');
            expect(() => validateOrgId('   ')).toThrow('Invalid organization ID');
        });

        it('should reject non-UUID formats', () => {
            expect(() => validateOrgId('not-a-uuid')).toThrow('Invalid organization ID format');
            expect(() => validateOrgId('123')).toThrow('Invalid organization ID format');
            expect(() => validateOrgId('g23e4567-e89b-12d3-a456-426614174000')).toThrow('Invalid organization ID format');
        });

        it('should prevent SQL injection attempts', () => {
            const sqlInjection = "'; DROP TABLE organizations; --";
            expect(() => validateOrgId(sqlInjection)).toThrow('Invalid organization ID format');
            
            const unionInjection = "' UNION SELECT * FROM users --";
            expect(() => validateOrgId(unionInjection)).toThrow('Invalid organization ID format');
            
            const orInjection = "' OR '1'='1";
            expect(() => validateOrgId(orInjection)).toThrow('Invalid organization ID format');
        });

        it('should trim whitespace from valid UUIDs', () => {
            const uuid = '123e4567-e89b-12d3-a456-426614174000';
            expect(validateOrgId(`  ${uuid}  `)).toBe(uuid);
        });
    });

    describe('validateSortDirection', () => {
        it('should accept valid sort directions', () => {
            expect(validateSortDirection('asc')).toBe('asc');
            expect(validateSortDirection('desc')).toBe('desc');
            expect(validateSortDirection('ASC')).toBe('asc');
            expect(validateSortDirection('DESC')).toBe('desc');
        });

        it('should default to asc when null or undefined', () => {
            expect(validateSortDirection(null)).toBe('asc');
            expect(validateSortDirection(undefined)).toBe('asc');
        });

        it('should reject invalid sort directions', () => {
            expect(() => validateSortDirection('up')).toThrow('Invalid sort direction');
            expect(() => validateSortDirection('down')).toThrow('Invalid sort direction');
            expect(() => validateSortDirection('1=1')).toThrow('Invalid sort direction');
        });

        it('should prevent SQL injection in sort direction', () => {
            expect(() => validateSortDirection('asc; DELETE FROM users;')).toThrow('Invalid sort direction');
            expect(() => validateSortDirection('asc OR 1=1')).toThrow('Invalid sort direction');
        });
    });

    describe('validateLimit', () => {
        it('should accept valid limits', () => {
            expect(validateLimit(50)).toBe(50);
            expect(validateLimit(1)).toBe(1);
            expect(validateLimit(1000)).toBe(1000);
        });

        it('should use default when undefined', () => {
            expect(validateLimit(undefined)).toBe(50);
            expect(validateLimit(undefined, 100)).toBe(100);
        });

        it('should respect max limit', () => {
            expect(() => validateLimit(1001)).toThrow('Limit exceeds maximum allowed value of 1000');
            expect(() => validateLimit(101, 50, 100)).toThrow('Limit exceeds maximum allowed value of 100');
        });

        it('should reject invalid limits', () => {
            expect(() => validateLimit(0)).toThrow('Invalid limit');
            expect(() => validateLimit(-1)).toThrow('Invalid limit');
            expect(() => validateLimit(NaN)).toThrow('Invalid limit');
        });

        it('should floor decimal values', () => {
            expect(validateLimit(50.9)).toBe(50);
        });
    });

    describe('validateOffset', () => {
        it('should accept valid offsets', () => {
            expect(validateOffset(0)).toBe(0);
            expect(validateOffset(100)).toBe(100);
            expect(validateOffset(1000000)).toBe(1000000);
        });

        it('should default to 0 when undefined', () => {
            expect(validateOffset(undefined)).toBe(0);
        });

        it('should reject negative offsets', () => {
            expect(() => validateOffset(-1)).toThrow('Invalid offset');
            expect(() => validateOffset(-100)).toThrow('Invalid offset');
        });

        it('should reject invalid offsets', () => {
            expect(() => validateOffset(NaN)).toThrow('Invalid offset');
        });

        it('should floor decimal values', () => {
            expect(validateOffset(10.5)).toBe(10);
        });
    });
});