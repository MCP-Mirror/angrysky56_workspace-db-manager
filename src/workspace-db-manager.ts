import { AsyncDatabase } from './lib/sqlite-wrapper.js';
import { FileSystemMonitor, FileEvent } from './lib/filesystem-monitor.js';
import { EventEmitter } from 'events';
import { dirname } from 'path';
import type { DatabaseConfig, SystemConfig, DatabaseQueryResult } from './types/database.js';
import debug from 'debug';

const log = debug('workspace:db-manager');

interface WorkspaceConfig {
    database?: DatabaseConfig;
    watchPaths: string[];
    pollInterval?: number;
}

class WorkspaceDBManager extends EventEmitter {
    private dbManager: AsyncDatabase;
    private fsMonitor: FileSystemMonitor;
    private initialized: boolean = false;

    constructor(config: WorkspaceConfig) {
        super();
        this.dbManager = new AsyncDatabase('core.db', { verbose: config.database?.verbose });
        this.fsMonitor = new FileSystemMonitor({
            paths: config.watchPaths,
            pollInterval: config.pollInterval
        });

        // Setup event handlers
        this.setupEventHandlers();
    }

    private setupEventHandlers() {
        this.on('initialized', () => {
            log('Workspace DB Manager initialized successfully');
        });

        this.on('error', (error) => {
            log('Workspace DB Manager error:', error);
        });

        this.on('cleanup', () => {
            log('Workspace DB Manager cleanup complete');
        });

        // File system events
        this.fsMonitor.on('file-add', (event: FileEvent) => this.handleNewDatabase(event));
        this.fsMonitor.on('file-change', (event: FileEvent) => this.handleDatabaseChange(event));
        this.fsMonitor.on('file-unlink', (event: FileEvent) => this.handleDatabaseRemove(event));
        this.fsMonitor.on('error', (error) => this.emit('error', error));
    }

    async initialize(): Promise<void> {
        if (this.initialized) return;

        try {
            log('Initializing Workspace DB Manager...');
            await this.dbManager.connect();
            
            // Initialize core tables
            log('Setting up core database tables...');
            await this.initializeTables();
            
            // Verify system configuration
            log('Verifying system configuration...');
            await this.verifySystemConfig();

            // Start filesystem monitoring
            log('Starting filesystem monitor...');
            await this.fsMonitor.start();
            
            this.initialized = true;
            this.emit('initialized');
        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    }

    private async initializeTables(): Promise<void> {
        await this.dbManager.execute(`
            CREATE TABLE IF NOT EXISTS system_config (
                config_key TEXT PRIMARY KEY,
                config_value TEXT NOT NULL,
                last_modified DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS active_mcp_servers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                server_type TEXT NOT NULL,
                server_id TEXT UNIQUE NOT NULL,
                status TEXT CHECK (status IN ('active', 'inactive', 'error')) DEFAULT 'inactive',
                last_heartbeat DATETIME,
                config TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS managed_databases (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                path TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                size INTEGER,
                last_modified DATETIME,
                status TEXT CHECK (status IN ('active', 'inactive', 'error', 'removed')) DEFAULT 'active',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_checked DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);
    }

    private async verifySystemConfig(): Promise<void> {
        const configs = [
            {
                key: 'initialization_status',
                value: JSON.stringify({ status: 'completed', version: '1.0' })
            },
            {
                key: 'ethical_framework',
                value: JSON.stringify({
                    version: '1.0',
                    principles: ['wisdom', 'integrity', 'fairness', 'empathy']
                })
            }
        ];

        for (const config of configs) {
            await this.dbManager.execute(
                `INSERT OR IGNORE INTO system_config (config_key, config_value) VALUES (?, ?)`,
                [config.key, config.value]
            );
        }

        const status = await this.getConfig('initialization_status');
        log('System configuration status:', status);
    }

    private async handleNewDatabase(event: FileEvent): Promise<void> {
        try {
            log('New database detected:', event.path);
            await this.dbManager.execute(
                `INSERT OR IGNORE INTO managed_databases (path, name, size, last_modified) 
                 VALUES (?, ?, ?, datetime('now'))`,
                [event.path, basename(event.path), event.size]
            );
            this.emit('database-added', event.path);
        } catch (error) {
            log('Error handling new database:', error);
            this.emit('error', error);
        }
    }

    private async handleDatabaseChange(event: FileEvent): Promise<void> {
        try {
            log('Database changed:', event.path);
            await this.dbManager.execute(
                `UPDATE managed_databases 
                 SET size = ?, last_modified = datetime('now'), last_checked = datetime('now')
                 WHERE path = ?`,
                [event.size, event.path]
            );
            this.emit('database-changed', event.path);
        } catch (error) {
            log('Error handling database change:', error);
            this.emit('error', error);
        }
    }

    private async handleDatabaseRemove(event: FileEvent): Promise<void> {
        try {
            log('Database removed:', event.path);
            await this.dbManager.execute(
                `UPDATE managed_databases 
                 SET status = 'removed', last_checked = datetime('now')
                 WHERE path = ?`,
                [event.path]
            );
            this.emit('database-removed', event.path);
        } catch (error) {
            log('Error handling database removal:', error);
            this.emit('error', error);
        }
    }

    async getConfig(key: string): Promise<DatabaseQueryResult<SystemConfig>> {
        return this.dbManager.get<SystemConfig>(
            'SELECT * FROM system_config WHERE config_key = ?',
            [key]
        );
    }

    async listManagedDatabases(): Promise<any[]> {
        return this.dbManager.query(
            'SELECT * FROM managed_databases WHERE status != ?',
            ['removed']
        );
    }

    async cleanup(): Promise<void> {
        try {
            await this.fsMonitor.stop();
            await this.dbManager.close();
            this.initialized = false;
            this.emit('cleanup');
        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    }

    isInitialized(): boolean {
        return this.initialized;
    }
}

export { WorkspaceDBManager, type WorkspaceConfig };