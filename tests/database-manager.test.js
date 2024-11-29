import { jest } from '@jest/globals';
import DatabaseManager from '../database-manager.js';
import { ErrorHandler } from '../error-handler.js';
import { createTestEnvironment, cleanupTestEnvironment } from './test-setup.js';

describe('DatabaseManager', () => {
    let testEnv;
    let dbManager;
    let errorHandler;

    beforeAll(async () => {
        testEnv = await createTestEnvironment();
        errorHandler = new ErrorHandler('test-errors.log');
        dbManager = new DatabaseManager(errorHandler);
    });

    afterAll(async () => {
        await cleanupTestEnvironment(testEnv.testDir);
    });

    test('should connect to database successfully', async () => {
        const db = await dbManager.connectDatabase(testEnv.testDatabases[0], 'test1');
        expect(db).toBeTruthy();
        expect(dbManager.connections.has('test1')).toBe(true);
    });

    test('should handle connection errors gracefully', async () => {
        await expect(dbManager.connectDatabase('/nonexistent/db.db', 'invalid'))
            .rejects
            .toThrow();
    });

    test('should manage connection pool correctly', async () => {
        const db1 = await dbManager.getConnection(testEnv.testDatabases[0]);
        const db2 = await dbManager.getConnection(testEnv.testDatabases[0]);
        expect(db1).toBe(db2); // Should return same connection from pool
    });

    test('should attach databases correctly', async () => {
        const mainDb = await dbManager.connectDatabase(testEnv.testDatabases[0], 'main');
        await expect(dbManager.attachDatabase(mainDb, testEnv.testDatabases[1], 'attached'))
            .resolves
            .not
            .toThrow();
    });

    test('should close connections properly', async () => {
        const db = await dbManager.connectDatabase(testEnv.testDatabases[0], 'close_test');
        await dbManager.closeConnection('close_test');
        expect(dbManager.connections.has('close_test')).toBe(false);
    });
});