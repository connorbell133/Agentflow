import { createLogger } from './logger';

describe('Logger Sanitization', () => {
    let consoleLogSpy: jest.SpyInstance;
    let consoleWarnSpy: jest.SpyInstance;
    let consoleErrorSpy: jest.SpyInstance;
    let consoleDebugSpy: jest.SpyInstance;

    beforeEach(() => {
        // Mock console methods
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
        consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
        consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();

        // Set environment for testing
        process.env.NODE_ENV = 'development';
        process.env.NEXT_PUBLIC_DEBUG = 'true';
    });

    afterEach(() => {
        // Restore all mocks
        consoleLogSpy.mockRestore();
        consoleWarnSpy.mockRestore();
        consoleErrorSpy.mockRestore();
        consoleDebugSpy.mockRestore();

        // Reset environment
        delete process.env.NODE_ENV;
        delete process.env.NEXT_PUBLIC_DEBUG;
    });

    describe('Sensitive Data Redaction', () => {
        test('should redact password fields in objects', () => {
            const logger = createLogger('test-file');
            const sensitiveData = {
                username: 'john',
                password: 'secret123',
                email: 'john@example.com'
            };

            logger.info('User login attempt', sensitiveData);

            expect(consoleLogSpy).toHaveBeenCalled();
            const logCall = consoleLogSpy.mock.calls[0][0];
            expect(logCall).toContain('[INFO] [test-file] User login attempt');
            expect(logCall).toContain('[REDACTED]');
            expect(logCall).not.toContain('secret123');
            expect(logCall).toContain('john@example.com');
        });

        test('should redact token fields', () => {
            const logger = createLogger('test-file');
            const tokenData = {
                userId: '123',
                token: 'jwt-token-here',
                refreshToken: 'refresh-token-here',
                role: 'admin'
            };

            logger.error('Token validation failed', tokenData);

            expect(consoleErrorSpy).toHaveBeenCalled();
            const errorCall = consoleErrorSpy.mock.calls[0][0];
            expect(errorCall).toContain('[ERROR]');
            expect(errorCall).not.toContain('jwt-token-here');
            expect(errorCall).not.toContain('refresh-token-here');
            expect(errorCall).toContain('[REDACTED]');
            expect(errorCall).toContain('"role":"admin"');
        });

        test('should redact API keys and secrets', () => {
            const logger = createLogger('test-file');
            const configData = {
                apiKey: 'sk_live_abcd1234',
                secretKey: 'secret_xyz789',
                publicKey: 'pk_test_mnop5678',
                webhookSecret: 'whsec_qrst9012',
                endpoint: 'https://api.example.com'
            };

            logger.warn('Configuration loaded', configData);

            const warnCall = consoleWarnSpy.mock.calls[0][0];
            expect(warnCall).not.toContain('sk_live_abcd1234');
            expect(warnCall).not.toContain('secret_xyz789');
            expect(warnCall).not.toContain('pk_test_mnop5678');
            expect(warnCall).not.toContain('whsec_qrst9012');
            expect(warnCall).toContain('https://api.example.com');
            expect(warnCall).toMatch(/\[REDACTED\]/g);
        });

        test('should redact authorization and cookie headers', () => {
            const logger = createLogger('test-file');
            const headers = {
                'content-type': 'application/json',
                'authorization': 'Bearer eyJhbGciOi...',
                'cookie': 'sessionId=abc123; userId=456',
                'user-agent': 'Mozilla/5.0'
            };

            logger.debug('Request headers', headers);

            const debugCall = consoleDebugSpy.mock.calls[0][0];
            expect(debugCall).not.toContain('Bearer eyJhbGciOi');
            expect(debugCall).not.toContain('sessionId=abc123');
            expect(debugCall).toContain('[REDACTED]');
            expect(debugCall).toContain('Mozilla/5.0');
        });

        test('should handle nested objects with sensitive data', () => {
            const logger = createLogger('test-file');
            const nestedData = {
                user: {
                    id: '123',
                    profile: {
                        name: 'John Doe',
                        password: 'nested-password',
                        settings: {
                            apiToken: 'token-in-nested-object'
                        }
                    }
                },
                metadata: {
                    timestamp: '2024-01-01'
                }
            };

            logger.info('Complex nested data', nestedData);

            const logCall = consoleLogSpy.mock.calls[0][0];
            expect(logCall).not.toContain('nested-password');
            expect(logCall).not.toContain('token-in-nested-object');
            expect(logCall).toContain('John Doe');
            expect(logCall).toContain('2024-01-01');
        });

        test('should handle arrays containing sensitive data', () => {
            const logger = createLogger('test-file');
            const arrayData = {
                users: [
                    { id: 1, password: 'pass1' },
                    { id: 2, password: 'pass2' },
                    { id: 3, token: 'token3' }
                ],
                count: 3
            };

            logger.info('User array', arrayData);

            const logCall = consoleLogSpy.mock.calls[0][0];
            expect(logCall).not.toContain('pass1');
            expect(logCall).not.toContain('pass2');
            expect(logCall).not.toContain('token3');
            expect(logCall).toContain('"count":3');
        });

        test('should redact string values containing sensitive keywords', () => {
            const logger = createLogger('test-file');
            const stringData = {
                message: 'User password reset',
                details: 'The token has expired',
                description: 'This is a normal description',
                secretMessage: 'This contains a secret'
            };

            logger.info('String sanitization test', stringData);

            const logCall = consoleLogSpy.mock.calls[0][0];
            expect(logCall).toContain('[REDACTED]'); // For messages containing sensitive keywords
            expect(logCall).toContain('This is a normal description');
        });

        test('should preserve normal data while redacting sensitive fields', () => {
            const logger = createLogger('test-file');
            const mixedData = {
                id: 12345,
                name: 'Product',
                price: 99.99,
                token: 'sensitive-token',
                isActive: true,
                tags: ['tag1', 'tag2'],
                password_hash: 'hashed_value'
            };

            logger.info('Mixed data types', mixedData);

            const logCall = consoleLogSpy.mock.calls[0][0];
            expect(logCall).toContain('"id":12345');
            expect(logCall).toContain('"name":"Product"');
            expect(logCall).toContain('"price":99.99');
            expect(logCall).toContain('"isActive":true');
            expect(logCall).toContain('tag1');
            expect(logCall).toContain('tag2');
            expect(logCall).not.toContain('sensitive-token');
            expect(logCall).not.toContain('hashed_value');
        });
    });

    describe('Normal Logging Functionality', () => {
        test('should log normally when no sensitive data is present', () => {
            const logger = createLogger('test-file');
            const normalData = {
                id: 1,
                name: 'John',
                email: 'john@example.com',
                role: 'user',
                created_at: '2024-01-01'
            };

            logger.info('Normal user data', normalData);

            const logCall = consoleLogSpy.mock.calls[0][0];
            expect(logCall).toContain('[INFO]');
            expect(logCall).toContain('Normal user data');
            expect(logCall).toContain('"id":1');
            expect(logCall).toContain('"name":"John"');
            expect(logCall).toContain('"email":"john@example.com"');
            expect(logCall).toContain('"role":"user"');
            expect(logCall).not.toContain('[REDACTED]');
        });

        test('should handle null and undefined values', () => {
            const logger = createLogger('test-file');

            logger.info('Null data', null);
            logger.info('Undefined data', undefined);
            logger.info('Empty object', {});

            expect(consoleLogSpy).toHaveBeenCalledTimes(3);
            // Should not throw errors
        });

        test('should handle primitive types correctly', () => {
            const logger = createLogger('test-file');

            logger.info('Number', 42);
            logger.info('Boolean', true);
            logger.info('String', 'Hello World');

            expect(consoleLogSpy).toHaveBeenCalledTimes(3);

            const calls = consoleLogSpy.mock.calls;
            expect(calls[0][0]).toContain('42');
            expect(calls[1][0]).toContain('true');
            expect(calls[2][0]).toContain('Hello World');
        });
    });

    describe('Environment-based Logging', () => {
        test('should not log info in production without debug flag', () => {
            process.env.NODE_ENV = 'production';
            delete process.env.NEXT_PUBLIC_DEBUG;

            const logger = createLogger('test-file');
            logger.info('This should not be logged');

            expect(consoleLogSpy).not.toHaveBeenCalled();
        });

        test('should log errors in production when LOG_ERRORS is true', () => {
            process.env.NODE_ENV = 'production';
            process.env.NEXT_PUBLIC_LOG_ERRORS = 'true';

            const logger = createLogger('test-file');
            logger.error('Production error', { password: 'secret' });

            expect(consoleErrorSpy).toHaveBeenCalled();
            const errorCall = consoleErrorSpy.mock.calls[0][0];
            expect(errorCall).toContain('[ERROR]');
            expect(errorCall).not.toContain('secret');
            expect(errorCall).toContain('[REDACTED]');

            delete process.env.NEXT_PUBLIC_LOG_ERRORS;
        });
    });

    describe('Performance', () => {
        test('should handle large objects without performance degradation', () => {
            const logger = createLogger('test-file');
            const largeObject: any = {
                metadata: {}
            };

            // Create a large nested structure
            for (let i = 0; i < 100; i++) {
                largeObject.metadata[`field_${i}`] = {
                    value: `value_${i}`,
                    password: `password_${i}`,
                    data: Array(10).fill({ id: i, token: `token_${i}` })
                };
            }

            const startTime = performance.now();
            logger.info('Large object', largeObject);
            const endTime = performance.now();

            expect(endTime - startTime).toBeLessThan(100); // Should complete in less than 100ms

            const logCall = consoleLogSpy.mock.calls[0][0];
            expect(logCall).not.toContain('password_');
            expect(logCall).not.toContain('token_');
        });
    });
});