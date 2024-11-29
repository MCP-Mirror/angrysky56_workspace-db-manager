import { AsyncDatabase } from '../lib/sqlite-wrapper.js';
import { unlink } from 'fs/promises';

describe('AsyncDatabase', () => {
    const TEST_DB = 'test.db';
    let db: AsyncDatabase;

    beforeEach(async () => {
        db = new AsyncDatabase(TEST_DB);
        await db.connect();
    });

    afterEach(async () => {
        await db.close();
        try {
            await unlink(TEST_DB);
        } catch (error) {
            // Ignore if file doesn't exist
        }
    });

    it('should create a table and insert data', async () => {
        await db.execute(`
            CREATE TABLE test (
                id INTEGER PRIMARY KEY,
                name TEXT
            )
        `);

        await db.execute('INSERT INTO test (name) VALUES (?)', ['test']);
        const result = await db.get('SELECT * FROM test');
        
        expect(result).toBeDefined();
        expect(result.name).toBe('test');
    });

    it('should handle transactions', async () => {
        await db.execute('CREATE TABLE test (id INTEGER PRIMARY KEY, value TEXT)');

        await db.transaction(async (db) => {
            await db.execute('INSERT INTO test (value) VALUES (?)', ['value1']);
            await db.execute('INSERT INTO test (value) VALUES (?)', ['value2']);
        });

        const results = await db.query('SELECT * FROM test');
        expect(results.length).toBe(2);
    });

    it('should rollback failed transactions', async () => {
        await db.execute('CREATE TABLE test (id INTEGER PRIMARY KEY, value TEXT)');

        try {
            await db.transaction(async (db) => {
                await db.execute('INSERT INTO test (value) VALUES (?)', ['value1']);
                throw new Error('Transaction test error');
            });
        } catch (error) {
            // Expected error
        }

        const results = await db.query('SELECT * FROM test');
        expect(results.length).toBe(0);
    });
});