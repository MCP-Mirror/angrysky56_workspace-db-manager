import { AsyncDatabase } from './sqlite-wrapper.js';
import path from 'path';

class MigrationManager {
    constructor(db) {
        this.db = db;
    }

    async initialize() {
        await this.db.execute(`
            CREATE TABLE IF NOT EXISTS migrations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE,
                applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
    }

    async applyMigration(name, commands) {
        const exists = await this.db.exists(
            'SELECT 1 FROM migrations WHERE name = ?',
            [name]
        );

        if (!exists) {
            await this.db.transaction(async (trx) => {
                for (const command of commands) {
                    await trx.execute(command);
                }
                await trx.execute(
                    'INSERT INTO migrations (name) VALUES (?)',
                    [name]
                );
            });
        }
    }

    async getMigrationStatus() {
        return await this.db.query('SELECT * FROM migrations ORDER BY applied_at');
    }
}

export { MigrationManager };