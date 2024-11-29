import { AsyncDatabase } from './lib/sqlite-wrapper.js';
import { ErrorHandler } from './error-handler.js';
import { ConnectionPool } from './lib/connection-pool.js';
import { fileURLToPath } from 'url';
import path from 'path';

class DatabaseManager {
    constructor(config = {}) {
        this.connections = new Map();
        this.errorHandler = new ErrorHandler();
        this.pool = new ConnectionPool(config.pool);
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;

        try {
            // Initialize core.db with managed_databases table
            const coreDb = await this.getConnection('core.db');
            await coreDb.execute(`
                CREATE TABLE IF NOT EXISTS managed_databases (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT UNIQUE,
                    path TEXT UNIQUE,
                    alias TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    last_accessed DATETIME,
                    status TEXT CHECK (status IN ('connected', 'disconnected', 'error', 'removed'))
                );

                CREATE INDEX IF NOT EXISTS idx_managed_databases_path ON managed_databases(path);
                CREATE INDEX IF NOT EXISTS idx_managed_databases_status ON managed_databases(status);
            `);

            this.initialized = true;
        } catch (error) {
            throw this.errorHandler.handleDatabaseError(error, 'initialize');
        }
    }

    async getConnection(dbPath) {
        const fullPath = path.resolve(dbPath);
        
        try {
            // Check if connection exists and is valid
            const existing = this.connections.get(fullPath);
            if (existing?.isValid()) {
                return existing;
            }

            // Create new connection
            const db = new AsyncDatabase(fullPath);
            await db.connect();
            this.connections.set(fullPath, db);

            // Register in core.db if it's not core.db itself
            if (dbPath !== 'core.db') {
                const coreDb = await this.getConnection('core.db');
                await coreDb.execute(`
                    INSERT OR REPLACE INTO managed_databases (
                        name, path, last_accessed, status
                    ) VALUES (?, ?, CURRENT_TIMESTAMP, 'connected')
                `, [path.basename(dbPath), fullPath]);
            }

            return db;
        } catch (error) {
            throw this.errorHandler.handleDatabaseError(error, 'get_connection');
        }
    }

    async createDatabase(name, location, schema = null) {
        const dbPath = path.join(location, name);
        
        try {
            const db = await this.getConnection(dbPath);

            if (schema) {
                await this.applySchema(db, schema);
            }

            return db;
        } catch (error) {
            throw this.errorHandler.handleDatabaseError(error, 'create_database');
        }
    }

    async applySchema(db, schema) {
        try {
            await db.transaction(async (trx) => {
                for (const table of schema.tables) {
                    const columns = table.columns
                        .map(col => `${col.name} ${col.type}${col.constraints ? ' ' + col.constraints : ''}`)
                        .join(', ');

                    await trx.execute(`
                        CREATE TABLE IF NOT EXISTS ${table.name} (
                            ${columns}
                        )
                    `);

                    // Create any specified indexes
                    if (table.indexes) {
                        for (const index of table.indexes) {
                            const indexColumns = index.columns.join(', ');
                            await trx.execute(`
                                CREATE ${index.unique ? 'UNIQUE' : ''} INDEX IF NOT EXISTS 
                                ${index.name} ON ${table.name}(${indexColumns})
                            `);
                        }
                    }
                }
            });
        } catch (error) {
            throw this.errorHandler.handleDatabaseError(error, 'apply_schema');
        }
    }

    async attachDatabase(mainDb, attachPath, alias) {
        try {
            const fullPath = path.resolve(attachPath);
            await mainDb.execute(`ATTACH DATABASE ? AS ?`, [fullPath, alias]);

            // Update core.db
            const coreDb = await this.getConnection('core.db');
            await coreDb.execute(`
                UPDATE managed_databases 
                SET alias = ?, last_accessed = CURRENT_TIMESTAMP
                WHERE path = ?
            `, [alias, fullPath]);
        } catch (error) {
            throw this.errorHandler.handleDatabaseError(error, 'attach_database');
        }
    }

    async closeConnection(dbPath) {
        try {
            const fullPath = path.resolve(dbPath);
            const db = this.connections.get(fullPath);
            
            if (db) {
                await db.close();
                this.connections.delete(fullPath);

                // Update status in core.db
                if (dbPath !== 'core.db') {
                    const coreDb = await this.getConnection('core.db');
                    await coreDb.execute(`
                        UPDATE managed_databases 
                        SET status = 'disconnected', 
                            last_accessed = CURRENT_TIMESTAMP
                        WHERE path = ?
                    `, [fullPath]);
                }
            }
        } catch (error) {
            throw this.errorHandler.handleDatabaseError(error, 'close_connection');
        }
    }

    async listDatabases() {
        try {
            const coreDb = await this.getConnection('core.db');
            return await coreDb.query(`
                SELECT 
                    name,
                    path,
                    alias,
                    created_at,
                    last_accessed,
                    status
                FROM managed_databases
                ORDER BY created_at DESC
            `);
        } catch (error) {
            throw this.errorHandler.handleDatabaseError(error, 'list_databases');
        }
    }

    async getDatabaseInfo(dbPath) {
        try {
            const coreDb = await this.getConnection('core.db');
            const fullPath = path.resolve(dbPath);
            
            return await coreDb.get(`
                SELECT 
                    name,
                    path,
                    alias,
                    created_at,
                    last_accessed,
                    status
                FROM managed_databases
                WHERE path = ?
            `, [fullPath]);
        } catch (error) {
            throw this.errorHandler.handleDatabaseError(error, 'get_database_info');
        }
    }

    async cleanup() {
        try {
            // Close all connections
            for (const [path, db] of this.connections) {
                await this.closeConnection(path);
            }

            // Clear the connection pool
            await this.pool.cleanup();
        } catch (error) {
            throw this.errorHandler.handleDatabaseError(error, 'cleanup');
        }
    }
}

export { DatabaseManager };