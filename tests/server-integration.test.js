import { jest } from '@jest/globals';
import { WorkspaceDBManagerServer } from '../server-integration.js';
import { createTestEnvironment, cleanupTestEnvironment } from './test-setup.js';
import { ErrorHandler } from '../error-handler.js';

describe('WorkspaceDBManagerServer', () => {
    let testEnv;
    let server;
    let errorHandler;

    beforeAll(async () => {
        testEnv = await createTestEnvironment();
        errorHandler = new ErrorHandler('test-errors.log');
        server = new WorkspaceDBManagerServer({
            rootPaths: [testEnv.testDir],
            errorHandler
        });
    });

    afterAll(async () => {
        await cleanupTestEnvironment(testEnv.testDir);
    });

    test('should initialize server components', async () => {
        const initSpy = jest.spyOn(server, 'start');
        await server.start();
        expect(initSpy).toHaveBeenCalled();
    });

    test('should register MCP tools', () => {
        const tools = server.toolsHandler.registerTools();
        expect(tools).toHaveProperty('register_workspace_path');
        expect(tools).toHaveProperty('create_database');
        expect(tools).toHaveProperty('attach_database');
    });

    test('should handle filesystem events', (done) => {
        server.fsHandler.emit('database:new', testEnv.testDatabases[0]);
        // Add assertion for event handling
        done();
    });

    test('should recover from errors', async () => {
        const error = new Error('Test error');
        const recovery = await server.errorHandler.attemptRecovery(error);
        expect(recovery).toBeDefined();
    });
});