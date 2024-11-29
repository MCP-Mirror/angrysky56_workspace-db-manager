import { EventEmitter } from 'node:events';
import { watch } from 'node:fs/promises';
import { stat, readdir } from 'node:fs/promises';
import path from 'node:path';

class FileSystemHandler extends EventEmitter {
    constructor(rootPaths, options = {}) {
        super();
        this.rootPaths = rootPaths;
        this.watchers = new Map();
        this.options = {
            recursive: true,
            filter: /\.db$/i,
            ...options
        };
    }

    async initialize() {
        try {
            for (const rootPath of this.rootPaths) {
                await this.setupWatcher(rootPath);
            }
        } catch (error) {
            throw new Error(`Failed to initialize filesystem handler: ${error.message}`);
        }
    }

    async setupWatcher(rootPath) {
        try {
            // First, scan existing databases
            await this.scanDirectory(rootPath);

            // Then set up the watcher
            const watcher = watch(rootPath, { recursive: this.options.recursive });
            this.watchers.set(rootPath, watcher);

            // Handle file system events
            for await (const event of watcher) {
                if (this.options.filter.test(event.filename)) {
                    const fullPath = path.join(rootPath, event.filename);
                    
                    try {
                        const stats = await stat(fullPath);
                        if (stats.isFile()) {
                            switch (event.eventType) {
                                case 'rename':
                                    // Could be either creation or deletion
                                    if (await this.fileExists(fullPath)) {
                                        this.emit('database:new', fullPath);
                                    } else {
                                        this.emit('database:remove', fullPath);
                                    }
                                    break;
                                case 'change':
                                    this.emit('database:change', fullPath);
                                    break;
                            }
                        }
                    } catch (error) {
                        // File might have been deleted
                        if (error.code === 'ENOENT') {
                            this.emit('database:remove', fullPath);
                        } else {
                            console.error(`Error handling file event: ${error.message}`);
                        }
                    }
                }
            }
        } catch (error) {
            throw new Error(`Failed to setup watcher for ${rootPath}: ${error.message}`);
        }
    }

    async scanDirectory(dirPath) {
        try {
            const entries = await readdir(dirPath, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(dirPath, entry.name);
                
                if (entry.isDirectory() && this.options.recursive) {
                    await this.scanDirectory(fullPath);
                } else if (entry.isFile() && this.options.filter.test(entry.name)) {
                    this.emit('database:new', fullPath);
                }
            }
        } catch (error) {
            throw new Error(`Failed to scan directory ${dirPath}: ${error.message}`);
        }
    }

    async fileExists(filePath) {
        try {
            const stats = await stat(filePath);
            return stats.isFile();
        } catch (error) {
            if (error.code === 'ENOENT') {
                return false;
            }
            throw error;
        }
    }

    async cleanup() {
        for (const [path, watcher] of this.watchers) {
            try {
                await watcher.close();
            } catch (error) {
                console.error(`Error closing watcher for ${path}:`, error);
            }
        }
        this.watchers.clear();
    }
}

export { FileSystemHandler };