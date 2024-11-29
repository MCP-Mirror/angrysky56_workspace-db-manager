import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

interface DatabaseConfig {
    verbose?: boolean;
}

export class AsyncDatabase {
    private filename: string;
    private db: any;
    private config: DatabaseConfig;

    constructor(filename: string, config: DatabaseConfig = {}) {
        this.filename = filename;
        this.db = null;
        this.config = config;
    }

    async connect(): Promise<any> {
        if (!this.db) {
            this.db = await open({
                filename: this.filename,
                driver: sqlite3.Database
            });
            await this.db.run('PRAGMA foreign_keys = ON');
        }
        return this.db;
    }

    async close(): Promise<void> {
        if (this.db) {
            await this.db.close();
            this.db = null;
        }
    }

    async transaction<T>(callback: (db: AsyncDatabase) => Promise<T>): Promise<T> {
        const db = await this.connect();
        await db.run('BEGIN TRANSACTION');
        try {
            const result = await callback(this);
            await db.run('COMMIT');
            return result;
        } catch (error) {
            await db.run('ROLLBACK');
            throw error;
        }
    }

    async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
        const db = await this.connect();
        return db.all(sql, params);
    }

    async execute(sql: string, params: any[] = []): Promise<any> {
        const db = await this.connect();
        return db.run(sql, params);
    }

    async get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
        const db = await this.connect();
        return db.get(sql, params);
    }

    async exists(sql: string, params: any[] = []): Promise<boolean> {
        const result = await this.get(sql, params);
        return result !== undefined;
    }

    isValid(): boolean {
        return this.db !== null;
    }
}

export type { DatabaseConfig };