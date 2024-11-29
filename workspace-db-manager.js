import { MCPServerBase } from './lib/server-base.js';
import { DatabaseManager } from './database-manager.js';
import { FileSystemHandler } from './lib/filesystem-handler.js';
import { ErrorHandler } from './error-handler.js';
import { DiagnosticRunner } from './tools/run-diagnostics.js';

class WorkspaceDBManager extends MCPServerBase {
    constructor(config) {
        super(config);
        this.dbManager = new DatabaseManager(config.database);
        this.fsHandler = new FileSystemHandler(config.rootPaths);
        this.errorHandler = new ErrorHandler(config.errorLog);
        this.diagnostics = new DiagnosticRunner();
        this.initialized = false;
    }

    async setupServer() {
        if (this.initialized) return;

        try {
            // Initialize components
            await this.dbManager.initialize();
            await this.fsHandler.initialize();
            await this.diagnostics.initialize();

            // Register MCP tools
            this.registerTools();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Run initial diagnostics
            const diagnosticReport = await this.diagnostics.runSystemDiagnostics();
            console.log('Initial diagnostic report:', diagnosticReport);

            this.initialized = true;
        } catch (error) {
            throw this.errorHandler.handleServerError(error, 'setup_server');
        }
    }

    registerTools() {
        // Database management tools
        this.registerTool('create_database', {
            handler: this.handleCreateDatabase.bind(this),
            schema: {
                name: { type: 'string', required: true },
                location: { type: 'string', required: true },
                schema: { type: 'object', required: false }
            }
        });

        this.registerTool('attach_database', {
            handler: this.handleAttachDatabase.bind(this),
            schema: {
                path: { type: 'string', required: true },
                alias: { type: 'string', required: true }
            }
        });

        this.registerTool('list_databases', {
            handler: this.handleListDatabases.bind(this),
            schema: {}
        });

        this.registerTool('get_database_info', {
            handler: this.handleGetDatabaseInfo.bind(this),
            schema: {
                path: { type: 'string', required: true }
            }
        });

        this.registerTool('run_diagnostics', {
            handler: this.handleRunDiagnostics.bind(this),
            schema: {
                full: { type: 'boolean', required: false }
            }
        });
    }

    setupEventListeners() {
        this.fsHandler.on('database:new', this.handleNewDatabase.bind(this));
        this.fsHandler.on('database:change', this.handleDatabaseChange.bind(this));
        this.fsHandler.on('database:remove', this.handleDatabaseRemove.bind(this));
        
        // Handle process termination
        process.on('SIGINT', this.handleShutdown.bind(this));
        process.on('SIGTERM', this.handleShutdown.bind(this));
    }

    // Tool handlers
    async handleCreateDatabase(params) {
        try {
            return await this.dbManager.createDatabase(
                params.name,
                params.location,
                params.schema
            );
        } catch (error) {
            throw this.errorHandler.handleDatabaseError(error, 'create_database');
        }
    }

    async handleAttachDatabase(params) {
        try {
            const mainDb = await this.dbManager.getConnection('core.db');
            return await this.dbManager.attachDatabase(
                mainDb,
                params.path,
                params.alias
            );
        } catch (error) {
            throw this.errorHandler.handleDatabaseError(error, 'attach_database');
        }
    }

    async handleListDatabases() {
        try {
            return await this.dbManager.listDatabases();
        } catch (error) {
            throw this.errorHandler.handleDatabaseError(error, 'list_databases');
        }
    }

    async handleGetDatabaseInfo(params) {
        try {
            return await this.dbManager.getDatabaseInfo(params.path);
        } catch (error) {
            throw this.errorHandler.handleDatabaseError(error, 'get_database_info');
        }
    }

    async handleRunDiagnostics(params = {}) {
        try {
            return await this.diagnostics.runSystemDiagnostics(params.full);
        } catch (error) {
            throw this.errorHandler.handleServerError(error, 'run_diagnostics');
        }
    }

    // Event handlers
    async handleNewDatabase(path) {
        try {
            await this.dbManager.handleNewDatabase(path);
        } catch (error) {
            this.errorHandler.handleDatabaseError(error, 'handle_new_database');
        }
    }

    async handleDatabaseChange(path) {
        try {
            await this.dbManager.handleDatabaseChange(path);
        } catch (error) {
            this.errorHandler.handleDatabaseError(error, 'handle_database_change');
        }
    }

    async handleDatabaseRemove(path) {
        try {
            await this.dbManager.handleDatabaseRemove(path);
        } catch (error) {
            this.errorHandler.handleDatabaseError(error, 'handle_database_remove');
        }
    }

    async handleShutdown() {
        console.log('Shutting down workspace-db-manager...');
        try {
            await this.dbManager.cleanup();
            await this.fsHandler.cleanup();
            await this.diagnostics.cleanup();
            process.exit(0);
        } catch (error) {
            console.error('Error during shutdown:', error);
            process.exit(1);
        }
    }
}

export { WorkspaceDBManager };