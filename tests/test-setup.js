import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

export async function createTestEnvironment() {
    const testDir = path.join(process.cwd(), 'test-workspace');
    const testDatabases = ['test1.db', 'test2.db', 'nested/test3.db'];

    try {
        // Create test directory structure
        await mkdir(testDir, { recursive: true });
        await mkdir(path.join(testDir, 'nested'), { recursive: true });

        // Create test database files
        for (const db of testDatabases) {
            await writeFile(path.join(testDir, db), '');
        }

        return {
            testDir,
            testDatabases: testDatabases.map(db => path.join(testDir, db))
        };
    } catch (error) {
        console.error('Failed to create test environment:', error);
        throw error;
    }
}

export async function cleanupTestEnvironment(testDir) {
    const { rm } = await import('fs/promises');
    try {
        await rm(testDir, { recursive: true, force: true });
    } catch (error) {
        console.error('Failed to cleanup test environment:', error);
        throw error;
    }
}