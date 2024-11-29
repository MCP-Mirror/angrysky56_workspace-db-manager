import FileSystemHandler from './filesystem-handler';
import DatabaseManager from './database-manager';
import ToolsHandler from './tools-handler';

export class WorkspaceDBManagerServer {
    constructor(config) {
        this.config = config;
        this.fsHandler = new FileSystemHandler(config.rootPaths);
        this.dbManager = new DatabaseManager();
        this.toolsHandler = new ToolsHandler(this.fsHandler, this.dbManager);
    }

    async start() {
        // Initialize components
        await this.fsHandler.setupWatchers();
        await this.dbManager.initialize();
        
        // Register MCP tools
        this.registerMCPTools(this.toolsHandler.registerTools());
        
        // Start listening for events
        this.startEventListeners();
    }

    registerMCPTools(tools) {
        for (const [name, tool] of Object.entries(tools)) {
            this.registerTool(name, tool.handler, tool.schema);
        }
    }

    startEventListeners() {
        this.fsHandler.on('database:new', async (dbPath) => {
            try {
                await this.dbManager.handleNewDatabase(dbPath);
            } catch (error) {
                console.error(`Error handling new database: ${error.message}`);
            }
        });

        this.fsHandler.on('database:change', async (dbPath) => {
            try {
                await this.dbManager.handleDatabaseChange(dbPath);
            } catch (error) {
                console.error(`Error handling database change: ${error.message}`);
            }
        });

        this.fsHandler.on('database:remove', async (dbPath) => {
            try {
                await this.dbManager.handleDatabaseRemove(dbPath);
            } catch (error) {
                console.error(`Error handling database removal: ${error.message}`);
            }
        });
    }
}

export default WorkspaceDBManagerServer;