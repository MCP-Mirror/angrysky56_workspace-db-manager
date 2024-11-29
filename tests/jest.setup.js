// Increase timeout for all tests
jest.setTimeout(10000);

// Mock MCP Server Base
jest.mock('@modelcontextprotocol/server-base', () => ({
    MCPServer: class MockMCPServer {
        constructor(config) {
            this.config = config;
        }
        registerTool(name, handler, schema) {
            return true;
        }
    }
}));

// Setup global error handler
process.on('unhandledRejection', (error) => {
    console.error('Unhandled Promise Rejection:', error);
});