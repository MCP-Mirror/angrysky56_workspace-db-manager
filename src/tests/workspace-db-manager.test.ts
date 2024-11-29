import { WorkspaceDBManager } from '../workspace-db-manager.js';
import { join } from 'path';
import { writeFile, unlink, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import { ensureTestDirectory, getTestDirectory } from './helpers.js';

describe('WorkspaceDBManager', () => {
    const TEST_DIR = getTestDirectory();
    let manager: WorkspaceDBManager;

    beforeAll(async () => {
        await ensureTestDirectory(TEST_DIR);
    });

    beforeEach(async () => {
        // Make sure directory exists before each test
        await ensureTestDirectory(TEST_DIR);
        
        manager = new WorkspaceDBManager({
            watchPaths: [TEST_DIR],
            pollInterval: 100,
            database: {
                verbose: process.env.DEBUG ? true : false
            }
        });
    });

    afterEach(async () => {
        await manager.cleanup();
        if (existsSync(TEST_DIR)) {
            try {
                const files = await readdir(TEST_DIR);
                for (const file of files) {
                    if (file.endsWith('.db')) {
                        await unlink(join(TEST_DIR, file));
                    }
                }
            } catch (error: any) {
                if (error.code !== 'ENOENT') {
                    console.error('Error cleaning up test files:', error);
                }
            }
        }
    });

    it('should initialize successfully', async () => {
        await expect(manager.initialize()).resolves.not.toThrow();
        expect(manager.isInitialized()).toBe(true);
    }, 10000);

    it('should detect and track new databases', async () => {
        await manager.initialize();

        const dbPath = join(TEST_DIR, 'test.db');
        await writeFile(dbPath, 'test data');

        // Wait for the file to be processed
        await new Promise(resolve => setTimeout(resolve, 2000));

        const databases = await manager.listManagedDatabases();
        expect(databases.length).toBeGreaterThan(0);
        expect(databases[0].path).toContain('test.db');
        expect(databases[0].status).toBe('active');
    }, 15000);

    it('should handle database removal', async () => {
        await manager.initialize();

        const dbPath = join(TEST_DIR, 'test.db');
        await writeFile(dbPath, 'test data');

        // Wait for the file to be processed
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Verify file was tracked
        let databases = await manager.listManagedDatabases();
        expect(databases.length).toBeGreaterThan(0);

        // Remove the database
        await unlink(dbPath);

        // Wait for the removal to be processed
        await new Promise(resolve => setTimeout(resolve, 2000));

        databases = await manager.listManagedDatabases();
        expect(databases.length).toBe(0);
    }, 20000);

    it('should maintain system configuration', async () => {
        await manager.initialize();

        const config = await manager.getConfig('initialization_status');
        expect(config).toBeDefined();
        if (config) {
            const value = JSON.parse(config.config_value);
            expect(value).toHaveProperty('status', 'completed');
        }
    }, 10000);
});