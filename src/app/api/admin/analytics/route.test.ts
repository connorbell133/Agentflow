import { GET } from '@/app/api/admin/analytics/conversations/daily/route';
import { NextRequest } from 'next/server';

// Import db from the connection which is already mocked
const { db } = require('@/db/connection');

describe('Analytics API Route - SQL Injection Prevention', () => {
    // Helper to create a mock query builder
    const createMockQueryBuilder = (finalResult: any[] = []) => {
        const queryBuilder: any = {
            select: jest.fn(),
            from: jest.fn(),
            where: jest.fn(),
            leftJoin: jest.fn(),
            rightJoin: jest.fn(),
            innerJoin: jest.fn(),
            groupBy: jest.fn(),
            having: jest.fn(),
            orderBy: jest.fn(),
            limit: jest.fn(),
            offset: jest.fn(),
            execute: jest.fn().mockResolvedValue(finalResult),
        };
        
        // Set up chainable methods
        Object.keys(queryBuilder).forEach(method => {
            queryBuilder[method].mockImplementation((...args: any[]) => {
                // If it's the last method in typical chains, return a promise
                if (method === 'orderBy' || method === 'limit' || method === 'offset') {
                    // Check if there's a next method call by returning a thenable object
                    const result = Promise.resolve(finalResult);
                    // Also add chainable methods to the promise for cases where chain continues
                    Object.keys(queryBuilder).forEach(m => {
                        (result as any)[m] = queryBuilder[m];
                    });
                    return result;
                }
                return queryBuilder;
            });
        });
        
        return queryBuilder;
    };
    
    beforeEach(() => {
        jest.clearAllMocks();
        
        // Setup default empty response
        const defaultQueryBuilder = createMockQueryBuilder([]);
        db.select.mockImplementation(() => defaultQueryBuilder);
        db.execute.mockResolvedValue([]);
    });

    describe('GET /api/admin/analytics/conversations/daily', () => {
        const createRequest = (orgId?: string, days?: string) => {
            const url = new URL('http://localhost:3000/api/admin/analytics/conversations/daily');
            if (orgId) url.searchParams.set('orgId', orgId);
            if (days) url.searchParams.set('days', days);
            return new NextRequest(url);
        };

        it('should reject requests with SQL injection in orgId', async () => {
            const sqlInjectionPayloads = [
                "'; DROP TABLE conversations; --",
                "' OR '1'='1",
                "' UNION SELECT * FROM users --",
                "123' OR 1=1--",
            ];

            for (const payload of sqlInjectionPayloads) {
                const request = createRequest(payload, '30');
                const response = await GET(request);
                const data = await response.json();

                expect(response.status).toBe(400);
                expect(data.error).toBe('Validation failed');
                expect(data.issues?.fieldErrors?.orgId).toBeDefined();
            }
        });

        it('should reject requests with invalid orgId formats', async () => {
            const invalidOrgIds = [
                'not-a-uuid',
                '123',
                '',
                'null',
                'undefined',
            ];

            for (const orgId of invalidOrgIds) {
                const request = createRequest(orgId, '30');
                const response = await GET(request);
                const data = await response.json();

                expect(response.status).toBe(400);
                expect(data.error).toBeTruthy();
            }
        });

        it('should reject requests without orgId', async () => {
            const request = createRequest(undefined, '30');
            const response = await GET(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Validation failed');
            expect(data.issues?.fieldErrors?.orgId).toBeDefined();
        });

        it('should validate days parameter', async () => {
            const validOrgId = '123e4567-e89b-12d3-a456-426614174000';
            const invalidDays = [
                '0',
                '-1',
                '366',
                '1000',
                'abc',
                '30; DELETE FROM conversations;',
                '30 OR 1=1',
            ];

            for (const days of invalidDays) {
                const request = createRequest(validOrgId, days);
                const response = await GET(request);
                const data = await response.json();

                expect(response.status).toBe(400);
                expect(data.error).toBe('Validation failed');
                expect(data.issues?.fieldErrors?.days).toBeDefined();
            }
        });

        it('should accept valid parameters', async () => {
            const validOrgId = '123e4567-e89b-12d3-a456-426614174000';
            const mockData = [
                { date: '2025-08-21', count: 5 },
                { date: '2025-08-22', count: 3 }
            ];
            
            // Setup mock query builder to return data
            db.select.mockImplementation(() => createMockQueryBuilder(mockData));
            db.execute.mockResolvedValue(mockData);
            
            const request = createRequest(validOrgId, '30');
            const response = await GET(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data).toHaveProperty('data');
            expect(data.data).toEqual(mockData);
            expect(db.select).toHaveBeenCalled();
        });

        it('should use default days value when not provided', async () => {
            const validOrgId = '123e4567-e89b-12d3-a456-426614174000';
            const mockData = [
                { date: '2025-08-20', count: 10 },
                { date: '2025-08-21', count: 15 }
            ];
            
            // Setup mock query builder to return data
            db.select.mockImplementation(() => createMockQueryBuilder(mockData));
            db.execute.mockResolvedValue(mockData);
            
            const request = createRequest(validOrgId);
            const response = await GET(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data).toHaveProperty('data');
            expect(data.data).toEqual(mockData);
        });

        it('should handle server errors gracefully', async () => {
            const validOrgId = '123e4567-e89b-12d3-a456-426614174000';
            
            // Make the database throw an error
            db.select.mockImplementation(() => {
                throw new Error('Database connection failed');
            });

            const request = createRequest(validOrgId, '30');
            const response = await GET(request);
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.error).toBe('Internal Server Error');
        });

        it('should handle timezone correctly and return dates in UTC format', async () => {
            const validOrgId = '123e4567-e89b-12d3-a456-426614174000';
            
            // Mock database response with multiple dates
            const mockData = [
                { date: '2025-08-21', count: 5 },
                { date: '2025-08-22', count: 3 },
                { date: '2025-08-23', count: 7 },
                { date: '2025-08-24', count: 2 },
                { date: '2025-08-25', count: 10 }
            ];
            
            // Setup mock query builder to return data
            db.select.mockImplementation(() => createMockQueryBuilder(mockData));
            db.execute.mockResolvedValue(mockData);

            const request = createRequest(validOrgId, '7');
            const response = await GET(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.data).toHaveLength(5);
            
            // Check that all dates are returned and different
            const dates = data.data.map((d: any) => d.date);
            const uniqueDates = new Set(dates);
            expect(uniqueDates.size).toBe(5); // All 5 dates should be unique
            
            // Verify date format is YYYY-MM-DD
            dates.forEach((date: string) => {
                expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
            });
        });
    });
});