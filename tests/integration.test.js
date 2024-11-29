import { jest } from '@jest/globals';
import { WorkspaceDBManagerServer } from '../server-integration.js';
import { ErrorHandler } from '../error-handler.js';
import { createTestEnvironment, cleanupTestEnvironment } from './test-setup.js';
import path from 'path';
import fs from 'fs/promises';

describe('WorkspaceDBManager Integration', () => {
    let testEnv;
    let server;
    let errorHandler;

    beforeAll(async () => {
        testEnv = await createTestEnvironment();
        errorHandler = new ErrorHandler(path.join(testEnv.testDir, 'server-errors.log'));
        server = new WorkspaceDBManagerServer({
            rootPaths: [testEnv.testDir],
            errorHandler
        });
        await server.start();
    });

    afterAll(async () => {
        await cleanupTestEnvironment(testEnv.testDir);
    });

    test('full workflow - create, monitor, and query database', async () => {
        // 1. Create new database
        const dbName = 'workflow-test.db';
        const dbPath = path.join(testEnv.testDir, dbName);
        
        await server.toolsHandler.handleCreateDatabase({
            name: dbName,
            location: testEnv.testDir,
            schema: {
                tables: [{
                    name: 'test_table',
                    columns: [
                        { name: 'id', type: 'INTEGER PRIMARY KEY' },
                        { name: 'value', type: 'TEXT' }
                    ]
                }]
            }
        });

        // 2. Verify file creation
        const stats = await fs.stat(dbPath);
        expect(stats.isFile()).toBe(true);

        // 3. Wait for file watcher to detect
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 4. Try database operations
        const db = await server.dbManager.getConnection(dbPath);
        expect(db).toBeTruthy();

        // 5. Test error handling
        const badPath = path.join(testEnv.testDir, 'nonexistent.db');
        await expect(
            server.dbManager.getConnection(badPath)
        ).rejects.toThrow();

        // 6. Test recovery
        const error = await server.errorHandler.handleDatabaseError(
            new Error('Test error'),
            'test operation'
        );
        expect(error).toBeTruthy();

        // 7. Test file monitoring
        const newDbPath = path.join(testEnv.testDir, 'monitored.db');
        await fs.writeFile(newDbPath, '');
        
        // Wait for watcher
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Verify detection
        const discoveredDbs = await server.fsHandler.scanWorkspace();
        expect(discoveredDbs).toContain(newDbPath);
    });

    test('error cascading and recovery', async () => {
        // 1. Simulate filesystem error
        const fsError = new Error('Filesystem error');
        fsError.path = '/test/path';
        
        const handledFsError = await server.errorHandler.handleFileSystemError(
            fsError,
            'test operation'
        );

        // 2. Verify error is logged
        expect(handledFsError.code).toBe(ErrorHandler.ERROR_CODES.FILE_SYSTEM.WATCH_FAILED);

        // 3. Test recovery mechanism
        const recovered = await server.errorHandler.attemptRecovery(handledFsError);
        expect(recovered).toBeDefined();
    });

    test('cross-database operations', async () => {
        // 1. Create two test databases
        const db1Path = path.join(testEnv.testDir, 'cross1.db');
        const db2Path = path.join(testEnv.testDir, 'cross2.db');

        await server.toolsHandler.handleCreateDatabase({
            name: 'cross1.db',
            location: testEnv.testDir
        });

        await server.toolsHandler.handleCreateDatabase({
            name: 'cross2.db',
            location: testEnv.testDir
        });

        // 2. Attach databases
        const mainDb = await server.dbManager.getConnection(db1Path);
        await server.dbManager.attachDatabase(mainDb, db2Path, 'db2');

        // 3. Verify both databases are monitored
        const discoveredDbs = await server.fsHandler.scanWorkspace();
        expect(discoveredDbs).toContain(db1Path);
        expect(discoveredDbs).toContain(db2Path);
    });
});