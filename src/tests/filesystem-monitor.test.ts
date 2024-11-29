import { FileSystemMonitor, FileEvent } from '../lib/filesystem-monitor.js';
import { join } from 'path';
import { writeFile, unlink, mkdir, rmdir } from 'fs/promises';
import { existsSync } from 'fs';

describe('FileSystemMonitor', () => {
    const TEST_DIR = join(process.cwd(), 'test-files');
    const TEST_DB = join(TEST_DIR, 'test.db');
    
    let monitor: FileSystemMonitor;

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
        monitor = new FileSystemMonitor({
            paths: [TEST_DIR],
            pollInterval: 100,
            persistentWatch: false
        });
    });

    afterEach(async () => {
        await monitor.stop();
        if (existsSync(TEST_DB)) {
            await unlink(TEST_DB);
        }
    });

    it('should detect when a new database file is created', async () => {
        const eventPromise = new Promise<FileEvent>((resolve) => {
            monitor.once('file-add', resolve);
        });

        await monitor.start();
        await writeFile(TEST_DB, 'test data');

        const event = await eventPromise;
        expect(event.path).toContain('test.db');
        expect(event.type).toBe('add');
    });

    it('should detect when a database file is modified', async () => {
        // First create the file
        await writeFile(TEST_DB, 'initial data');
        await monitor.start();

        const eventPromise = new Promise<FileEvent>((resolve) => {
            monitor.once('file-change', resolve);
        });

        // Modify the file
        await writeFile(TEST_DB, 'modified data');

        const event = await eventPromise;
        expect(event.path).toContain('test.db');
        expect(event.type).toBe('change');
    });

    it('should detect when a database file is deleted', async () => {
        // First create the file
        await writeFile(TEST_DB, 'test data');
        await monitor.start();

        const eventPromise = new Promise<FileEvent>((resolve) => {
            monitor.once('file-unlink', resolve);
        });

        // Delete the file
        await unlink(TEST_DB);

        const event = await eventPromise;
        expect(event.path).toContain('test.db');
        expect(event.type).toBe('unlink');
    });

    it('should handle multiple file events', async () => {
        const events: FileEvent[] = [];
        monitor.on('file-event', (event) => events.push(event));

        await monitor.start();

        // Create, modify, and delete file
        await writeFile(TEST_DB, 'initial data');
        await writeFile(TEST_DB, 'modified data');
        await unlink(TEST_DB);

        // Wait for events to be processed
        await new Promise(resolve => setTimeout(resolve, 500));

        expect(events.length).toBeGreaterThanOrEqual(3);
        expect(events.map(e => e.type)).toEqual(
            expect.arrayContaining(['add', 'change', 'unlink'])
        );
    });
});
