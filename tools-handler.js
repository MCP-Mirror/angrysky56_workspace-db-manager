class ToolsHandler {
    constructor(fsHandler, dbManager) {
        this.fsHandler = fsHandler;
        this.dbManager = dbManager;
    }

    registerTools() {
        return {
            'register_workspace_path': {
                handler: this.handleRegisterPath.bind(this),
                schema: {
                    path: { type: 'string', required: true },
                    recursive: { type: 'boolean', default: true },
                    pattern: { type: 'string', default: '**/*.db' }
                }
            },
            'create_database': {
                handler: this.handleCreateDatabase.bind(this),
                schema: {
                    name: { type: 'string', required: true },
                    location: { type: 'string', required: true },
                    schema: { type: 'object', required: false }
                }
            },
            'attach_database': {
                handler: this.handleAttachDatabase.bind(this),
                schema: {
                    path: { type: 'string', required: true },
                    alias: { type: 'string', required: true }
                }
            }
        };
    }

    async handleRegisterPath({ path, recursive, pattern }) {
        try {
            await this.fsHandler.addWatchPath(path, { recursive, pattern });
            return { success: true, message: `Successfully registered path: ${path}` };
        } catch (error) {
            throw new Error(`Failed to register path: ${error.message}`);
        }
    }

    async handleCreateDatabase({ name, location, schema }) {
        try {
            const dbPath = path.join(location, `${name}.db`);
            const db = await this.dbManager.createDatabase(dbPath);
            
            if (schema) {
                await this.dbManager.applySchema(db, schema);
            }
            
            return { success: true, path: dbPath };
        } catch (error) {
            throw new Error(`Failed to create database: ${error.message}`);
        }
    }

    async handleAttachDatabase({ path, alias }) {
        try {
            await this.dbManager.attachDatabase(path, alias);
            return { success: true, message: `Successfully attached database as ${alias}` };
        } catch (error) {
            throw new Error(`Failed to attach database: ${error.message}`);
        }
    }
}

export default ToolsHandler;