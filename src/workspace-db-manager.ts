import { AsyncDatabase } from './lib/sqlite-wrapper.js';
import { EventEmitter } from 'events';
import type { DatabaseConfig, SystemConfig, DatabaseQueryResult } from './types/database.js';

class WorkspaceDBManager extends EventEmitter {
    private dbManager: AsyncDatabase;
    private initialized: boolean = false;

    constructor(config: DatabaseConfig = {}) {
        super();
        this.dbManager = new AsyncDatabase('core.db', { verbose: config.verbose });

        // Setup event handlers
        this.on('initialized', () => {
            console.log('Workspace DB Manager initialized successfully');
        });

        this.on('error', (error) => {
            console.error('Workspace DB Manager error:', error);
        });

        this.on('cleanup', () => {
            console.log('Workspace DB Manager cleanup complete');
        });
    }

    async initialize(): Promise<void> {
        if (this.initialized) return;

        try {
            console.log('Initializing Workspace DB Manager...');
            await this.dbManager.connect();
            
            // Initialize core tables
            console.log('Setting up core database tables...');
            await this.initializeTables();
            
            // Verify system configuration
            console.log('Verifying system configuration...');
            await this.verifySystemConfig();
            
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

        // Verify configs were set
        const status = await this.getConfig('initialization_status');
        console.log('System configuration status:', status);
    }

    async getConfig(key: string): Promise<DatabaseQueryResult<SystemConfig>> {
        return this.dbManager.get<SystemConfig>(
            'SELECT * FROM system_config WHERE config_key = ?',
            [key]
        );
    }

    async cleanup(): Promise<void> {
        try {
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

// Create server instance
const server = new WorkspaceDBManager();

// Handle shutdown
process.on('SIGINT', async () => {
    console.log('\nReceived SIGINT. Cleaning up...');
    await server.cleanup();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\nReceived SIGTERM. Cleaning up...');
    await server.cleanup();
    process.exit(0);
});

// Initialize and export server
console.log('Starting Workspace DB Manager...');
server.initialize().catch(error => {
    console.error('Failed to initialize server:', error);
    process.exit(1);
});

export default server;