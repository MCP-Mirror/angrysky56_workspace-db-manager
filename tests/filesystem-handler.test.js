import { jest } from '@jest/globals';
import { createTestEnvironment, cleanupTestEnvironment } from './test-setup.js';
import FileSystemHandler from '../filesystem-handler.js';
import { ErrorHandler } from '../error-handler.js';

describe('FileSystemHandler', () => {
    let testEnv;
    let fsHandler;
    let errorHandler;

    beforeAll(async () => {
        testEnv = await createTestEnvironment();
        errorHandler = new ErrorHandler('test-errors.log');
        fsHandler = new FileSystemHandler([testEnv.testDir], errorHandler);
    });

    afterAll(async () => {
        await cleanupTestEnvironment(testEnv.testDir);
    });

    test('should discover all database files in workspace', async () => {
        const databases = await fsHandler.scanWorkspace();
        expect(databases).toHaveLength(3);
        expect(databases).toEqual(expect.arrayContaining(testEnv.testDatabases));
    });

    test('should handle file watcher setup', async () => {
        const watchSpy = jest.spyOn(fsHandler, 'setupWatchers');
        await fsHandler.setupWatchers();
        expect(watchSpy).toHaveBeenCalled();
    });

    test('should emit events for database changes', (done) => {
        fsHandler.on('database:new', (path) => {
            expect(path).toBeTruthy();
            done();
        });

        // Simulate new database detection
        fsHandler.handleNewDatabase(testEnv.testDatabases[0]);
    });

    test('should handle invalid paths gracefully', async () => {
        const invalidPath = '/nonexistent/path';
        await expect(fsHandler.addWatchPath(invalidPath))
            .rejects
            .toThrow();
    });
});