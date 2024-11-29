import { WorkspaceDBManager } from '../workspace-db-manager.js';
import { join } from 'path';
import { writeFile, unlink, mkdir, rmdir } from 'fs/promises';
import { existsSync } from 'fs';

describe('WorkspaceDBManager', () => {
    const TEST_DIR = join(process.cwd(), 'test-workspace');
    let manager: WorkspaceDBManager;

    beforeAll(async () => {
        if (!existsSync(TEST_DIR)) {
            await mkdir(TEST_DIR);
        }
    });

    afterAll(async () => {
        try {
            await rmdir(TEST_DIR, { recursive: true });
        } catch (error) {
            console.error('Failed to clean up test directory:', error);
        }
    });

    beforeEach(() => {
        manager = new WorkspaceDBManager({
            watchPaths: [TEST_DIR],
            pollInterval: 100
        });
    });

    afterEach(async () => {
        await manager.cleanup();
        // Clean up any test databases
        const files = await readdir(TEST_DIR);
        for (const file of files) {
            if (file.endsWith('.db')) {
                await unlink(join(TEST_DIR, file));
            }
        }
    });

    it('should initialize successfully', async () => {
        await manager.initialize();
        expect(manager.isInitialized()).toBe(true);
    });

    it('should detect and track new databases', async () => {
        await manager.initialize();

        const dbPath = join(TEST_DIR, 'test.db');
        await writeFile(dbPath, 'test data');

        // Wait for the file to be processed
        await new Promise(resolve => setTimeout(resolve, 500));

        const databases = await manager.listManagedDatabases();
        expect(databases.length).toBe(1);
        expect(databases[0].path).toContain('test.db');
        expect(databases[0].status).toBe('active');
    });

    it('should handle database removal', async () => {
        await manager.initialize();

        const dbPath = join(TEST_DIR, 'test.db');
        await writeFile(dbPath, 'test data');

        // Wait for the file to be processed
        await new Promise(resolve => setTimeout(resolve, 500));

        // Remove the database
        await unlink(dbPath);

        // Wait for the removal to be processed
        await new Promise(resolve => setTimeout(resolve, 500));

        const databases = await manager.listManagedDatabases();
        expect(databases.length).toBe(0);
    });

    it('should maintain system configuration', async () => {
        await manager.initialize();

        const config = await manager.getConfig('initialization_status');
        expect(config).toBeDefined();
        expect(JSON.parse(config!.config_value)).toHaveProperty('status', 'completed');
    });
});