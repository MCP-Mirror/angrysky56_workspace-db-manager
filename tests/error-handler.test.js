import { jest } from '@jest/globals';
import { ErrorHandler, ServerError } from '../error-handler.js';
import path from 'path';
import fs from 'fs/promises';

describe('ErrorHandler', () => {
    let errorHandler;
    const testLogPath = 'test-errors.log';

    beforeEach(() => {
        errorHandler = new ErrorHandler(testLogPath);
    });

    afterEach(async () => {
        try {
            await fs.unlink(testLogPath);
        } catch (error) {
            // Ignore if file doesn't exist
        }
    });

    test('should create proper ServerError instances', () => {
        const error = new ServerError(
            ErrorHandler.ERROR_CODES.DATABASE.CONNECTION_FAILED,
            'Failed to connect',
            { db: 'test.db' }
        );

        expect(error).toBeInstanceOf(ServerError);
        expect(error.code).toBe(ErrorHandler.ERROR_CODES.DATABASE.CONNECTION_FAILED);
        expect(error.details).toEqual({ db: 'test.db' });
        expect(error.timestamp).toBeTruthy();
    });

    test('should log errors correctly', async () => {
        const testError = new ServerError(
            ErrorHandler.ERROR_CODES.FILE_SYSTEM.WATCH_FAILED,
            'Watch failed',
            { path: '/test/path' }
        );

        await errorHandler.logError(testError);

        const logContent = await fs.readFile(testLogPath, 'utf8');
        const logEntry = JSON.parse(logContent.trim());

        expect(logEntry).toMatchObject({
            code: ErrorHandler.ERROR_CODES.FILE_SYSTEM.WATCH_FAILED,
            message: 'Watch failed',
            details: { path: '/test/path' }
        });
    });

    test('should handle database errors appropriately', () => {
        const dbError = new Error('SQL error');
        dbError.sql = 'SELECT * FROM test';

        const handled = errorHandler.handleDatabaseError(dbError, 'query');

        expect(handled).toBeInstanceOf(ServerError);
        expect(handled.code).toBe(ErrorHandler.ERROR_CODES.DATABASE.QUERY_FAILED);
        expect(handled.details).toMatchObject({
            operation: 'query',
            sql: 'SELECT * FROM test'
        });
    });

    test('should handle filesystem errors appropriately', () => {
        const fsError = new Error('Path not found');
        fsError.path = '/test/path';

        const handled = errorHandler.handleFileSystemError(fsError, 'read');

        expect(handled).toBeInstanceOf(ServerError);
        expect(handled.code).toBe(ErrorHandler.ERROR_CODES.FILE_SYSTEM.WATCH_FAILED);
        expect(handled.details).toMatchObject({
            operation: 'read',
            path: '/test/path'
        });
    });

    test('should attempt recovery for known error types', async () => {
        const connectionError = new ServerError(
            ErrorHandler.ERROR_CODES.DATABASE.CONNECTION_FAILED,
            'Connection failed'
        );

        const recoverySpy = jest.spyOn(errorHandler, 'recoverDatabaseConnection');
        await errorHandler.attemptRecovery(connectionError);

        expect(recoverySpy).toHaveBeenCalled();
    });

    test('should handle nested errors', () => {
        const originalError = new Error('Original error');
        const wrappedError = errorHandler.handleServerError(originalError, 'test');

        expect(wrappedError.details).toMatchObject({
            originalError: 'Original error',
            operation: 'test'
        });
    });
});