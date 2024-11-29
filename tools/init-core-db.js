import { AsyncDatabase } from '../lib/sqlite-wrapper.js';
import path from 'path';

async function initializeCoreDb() {
    const db = new AsyncDatabase('core.db');
    
    try {
        await db.connect();
        
        // Create core tables
        await db.execute(`
            -- System configuration table
            CREATE TABLE IF NOT EXISTS system_config (
                config_key TEXT PRIMARY KEY,
                config_value TEXT NOT NULL,
                last_modified DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            -- Server tracking table
            CREATE TABLE IF NOT EXISTS active_mcp_servers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                server_type TEXT NOT NULL,
                server_id TEXT UNIQUE NOT NULL,
                status TEXT CHECK (status IN ('active', 'inactive', 'error')) DEFAULT 'inactive',
                last_heartbeat DATETIME,
                config TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            -- Create indexes
            CREATE INDEX IF NOT EXISTS idx_system_config_key ON system_config(config_key);
            CREATE INDEX IF NOT EXISTS idx_active_servers_type ON active_mcp_servers(server_type);
            CREATE INDEX IF NOT EXISTS idx_active_servers_status ON active_mcp_servers(status);
        `);

        // Insert initial system config if not exists
        await db.execute(`
            INSERT OR IGNORE INTO system_config (config_key, config_value) 
            VALUES 
                ('initialization_status', '{"status":"completed","version":"1.0"}'),
                ('ethical_framework', '{"version":"1.0","principles":["wisdom","integrity","fairness","empathy"]}'),
                ('initialization_protocol', '{"version":"1.0","status":"active"}'),
                ('meta_house_config', '{"version":"1.0","status":"configured"}');
        `);

        console.log('Core database initialized successfully');
    } catch (error) {
        console.error('Error initializing core database:', error);
        throw error;
    } finally {
        await db.close();
    }
}

// Run if this script is executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    initializeCoreDb().catch(console.error);
}

export { initializeCoreDb };