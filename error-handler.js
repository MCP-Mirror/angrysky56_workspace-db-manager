import { appendFile } from 'node:fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';

class ServerError extends Error {
    constructor(code, message, details = null) {
        super(message);
        this.name = 'ServerError';
        this.code = code;
        this.details = details;
        this.timestamp = new Date().toISOString();
    }

    toJSON() {
        return {
            name: this.name,
            code: this.code,
            message: this.message,
            details: this.details,
            timestamp: this.timestamp,
            stack: this.stack
        };
    }
}

class ErrorHandler {
    static ERROR_CODES = {
        DATABASE: {
            CONNECTION_FAILED: 'DB001',
            QUERY_FAILED: 'DB002',
            SCHEMA_INVALID: 'DB003',
            POOL_EXHAUSTED: 'DB004'
        },
        FILE_SYSTEM: {
            ACCESS_DENIED: 'FS001',
            NOT_FOUND: 'FS002',
            ALREADY_EXISTS: 'FS003'
        },
        SERVER: {
            INITIALIZATION_FAILED: 'SRV001',
            CONFIGURATION_INVALID: 'SRV002',
            OPERATION_FAILED: 'SRV003'
        }
    };

    constructor(logPath = './error.log') {
        this.logPath = logPath;
    }

    async logError(error) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            ...(error instanceof ServerError ? error.toJSON() : {
                name: error.name,
                message: error.message,
                stack: error.stack
            })
        };

        try {
            await appendFile(
                this.logPath,
                JSON.stringify(logEntry) + '\n',
                'utf8'
            );
        } catch (logError) {
            console.error('Failed to write to error log:', logError);
            console.error('Original error:', error);
        }
    }

    handleDatabaseError(error, operation) {
        const serverError = new ServerError(
            ErrorHandler.ERROR_CODES.DATABASE.QUERY_FAILED,
            `Database operation '${operation}' failed: ${error.message}`,
            {
                operation,
                originalError: error.message,
                sql: error.sql
            }
        );

        this.logError(serverError);
        return serverError;
    }

    handleFileSystemError(error, operation) {
        const code = error.code === 'ENOENT' ? 
            ErrorHandler.ERROR_CODES.FILE_SYSTEM.NOT_FOUND :
            error.code === 'EACCES' ?
                ErrorHandler.ERROR_CODES.FILE_SYSTEM.ACCESS_DENIED :
                ErrorHandler.ERROR_CODES.FILE_SYSTEM.OPERATION_FAILED;

        const serverError = new ServerError(
            code,
            `Filesystem operation '${operation}' failed: ${error.message}`,
            {
                operation,
                path: error.path,
                originalError: error.message
            }
        );

        this.logError(serverError);
        return serverError;
    }

    handleServerError(error, operation) {
        const serverError = new ServerError(
            ErrorHandler.ERROR_CODES.SERVER.OPERATION_FAILED,
            `Server operation '${operation}' failed: ${error.message}`,
            {
                operation,
                originalError: error.message
            }
        );

        this.logError(serverError);
        return serverError;
    }
}

export { ErrorHandler, ServerError };