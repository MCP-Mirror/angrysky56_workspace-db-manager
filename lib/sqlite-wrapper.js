import Database from 'better-sqlite3';

class AsyncDatabase {
    constructor(filename) {
        this.filename = filename;
        this.db = null;
    }

    async connect() {
        if (!this.db) {
            this.db = new Database(this.filename, { verbose: console.log });
            this.db.pragma('foreign_keys = ON');
        }
        return this.db;
    }

    async close() {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
    }

    async transaction(callback) {
        const db = await this.connect();
        await db.exec('BEGIN TRANSACTION');
        try {
            const result = await callback(this);
            await db.exec('COMMIT');
            return result;
        } catch (error) {
            await db.exec('ROLLBACK');
            throw error;
        }
    }

    async query(sql, params = []) {
        const db = await this.connect();
        return db.prepare(sql).all(params);
    }

    async execute(sql, params = []) {
        const db = await this.connect();
        return db.prepare(sql).run(params);
    }

    async get(sql, params = []) {
        const db = await this.connect();
        return db.prepare(sql).get(params);
    }

    async exists(sql, params = []) {
        const result = await this.get(sql, params);
        return result !== undefined;
    }

    isValid() {
        return this.db !== null;
    }
}

export { AsyncDatabase };