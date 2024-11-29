import { EventEmitter } from 'node:events';

class MCPServerBase extends EventEmitter {
    constructor(config = {}) {
        super();
        this.config = config;
        this.tools = new Map();
        this.resources = new Map();
        this.prompts = new Map();
    }

    /**
     * Initialize the server
     */
    async initialize() {
        try {
            await this.setupServer();
            this.emit('initialized');
        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    }

    /**
     * Setup server implementation
     * Should be overridden by implementing classes
     */
    async setupServer() {
        throw new Error('setupServer must be implemented by subclass');
    }

    /**
     * Register a tool with validation
     */
    registerTool(name, { handler, schema }) {
        if (this.tools.has(name)) {
            throw new Error(`Tool ${name} already registered`);
        }

        this.tools.set(name, {
            handler,
            schema
        });

        this.emit('tool:registered', name);
    }

    /**
     * Validate parameters against schema
     */
    validateParams(params, schema) {
        if (!schema) return true;

        const errors = [];

        // Check required parameters
        for (const [key, def] of Object.entries(schema)) {
            if (def.required && !(key in params)) {
                errors.push(`Missing required parameter: ${key}`);
                continue;
            }

            if (key in params) {
                const value = params[key];
                
                // Type checking
                if (def.type && typeof value !== def.type) {
                    errors.push(`Invalid type for parameter ${key}: expected ${def.type}, got ${typeof value}`);
                }

                // Range checking for numbers
                if (def.type === 'number') {
                    if (def.min !== undefined && value < def.min) {
                        errors.push(`${key} must be >= ${def.min}`);
                    }
                    if (def.max !== undefined && value > def.max) {
                        errors.push(`${key} must be <= ${def.max}`);
                    }
                }

                // String length checking
                if (def.type === 'string') {
                    if (def.minLength !== undefined && value.length < def.minLength) {
                        errors.push(`${key} must be at least ${def.minLength} characters`);
                    }
                    if (def.maxLength !== undefined && value.length > def.maxLength) {
                        errors.push(`${key} must be at most ${def.maxLength} characters`);
                    }
                }

                // Pattern matching for strings
                if (def.type === 'string' && def.pattern) {
                    const regex = new RegExp(def.pattern);
                    if (!regex.test(value)) {
                        errors.push(`${key} must match pattern: ${def.pattern}`);
                    }
                }

                // Array validation
                if (Array.isArray(value)) {
                    if (def.minItems !== undefined && value.length < def.minItems) {
                        errors.push(`${key} must have at least ${def.minItems} items`);
                    }
                    if (def.maxItems !== undefined && value.length > def.maxItems) {
                        errors.push(`${key} must have at most ${def.maxItems} items`);
                    }
                }

                // Custom validation
                if (def.validate) {
                    try {
                        def.validate(value);
                    } catch (error) {
                        errors.push(`${key}: ${error.message}`);
                    }
                }
            }
        }

        if (errors.length > 0) {
            throw new Error('Validation failed:\n' + errors.join('\n'));
        }

        return true;
    }

    /**
     * Execute a tool with validation and error handling
     */
    async executeTool(name, params) {
        const tool = this.tools.get(name);
        if (!tool) {
            throw new Error(`Tool ${name} not found`);
        }

        try {
            this.validateParams(params, tool.schema);
            const result = await tool.handler(params);
            this.emit('tool:executed', { name, params, result });
            return result;
        } catch (error) {
            this.emit('tool:error', { name, params, error });
            throw error;
        }
    }

    /**
     * Clean shutdown
     */
    async shutdown() {
        this.emit('shutdown:start');
        try {
            // Implement cleanup logic
            this.emit('shutdown:complete');
        } catch (error) {
            this.emit('shutdown:error', error);
            throw error;
        }
    }
}

export { MCPServerBase };