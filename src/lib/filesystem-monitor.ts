import { EventEmitter } from 'events';
import { watch } from 'chokidar';
import { basename, extname, join } from 'path';
import { statSync } from 'fs';
import debug from 'debug';

const log = debug('workspace:fs-monitor');

export interface FileSystemMonitorConfig {
    paths: string[];
    patterns?: string[];
    ignored?: string[];
    pollInterval?: number;
    persistentWatch?: boolean;
}

export interface FileEvent {
    path: string;
    type: 'add' | 'change' | 'unlink';
    timestamp: Date;
    size?: number;
    extension?: string;
}

export class FileSystemMonitor extends EventEmitter {
    private watcher: any;
    private config: FileSystemMonitorConfig;
    private isRunning: boolean = false;

    constructor(config: FileSystemMonitorConfig) {
        super();
        this.config = {
            ...config,
            patterns: config.patterns || ['**/*.db', '**/*.sqlite', '**/*.sqlite3'],
            ignored: config.ignored || [
                '**/node_modules/**',
                '**/.git/**',
                '**/dist/**',
                '**/*.db-journal'
            ],
            pollInterval: config.pollInterval || 1000,
            persistentWatch: config.persistentWatch ?? true
        };
    }

    async start(): Promise<void> {
        if (this.isRunning) {
            log('Monitor is already running');
            return;
        }

        try {
            log('Starting filesystem monitor with config:', this.config);

            const watchPaths = this.config.paths.map(path => 
                this.config.patterns!.map(pattern => join(path, pattern))
            ).flat();

            this.watcher = watch(watchPaths, {
                ignored: this.config.ignored,
                persistent: this.config.persistentWatch,
                ignoreInitial: false,
                usePolling: true,
                interval: this.config.pollInterval,
                awaitWriteFinish: {
                    stabilityThreshold: 2000,
                    pollInterval: 100
                }
            });

            // Set up event handlers
            this.watcher
                .on('add', (path: string) => this.handleFileEvent('add', path))
                .on('change', (path: string) => this.handleFileEvent('change', path))
                .on('unlink', (path: string) => this.handleFileEvent('unlink', path))
                .on('error', (error: Error) => {
                    log('Monitor error:', error);
                    this.emit('error', error);
                });

            this.isRunning = true;
            log('Filesystem monitor started');
            this.emit('started');

        } catch (error) {
            log('Failed to start monitor:', error);
            throw error;
        }
    }

    async stop(): Promise<void> {
        if (!this.isRunning) {
            log('Monitor is not running');
            return;
        }

        try {
            await this.watcher.close();
            this.isRunning = false;
            log('Filesystem monitor stopped');
            this.emit('stopped');
        } catch (error) {
            log('Failed to stop monitor:', error);
            throw error;
        }
    }

    private handleFileEvent(type: FileEvent['type'], path: string): void {
        try {
            const event: FileEvent = {
                path,
                type,
                timestamp: new Date(),
                extension: extname(path),
            };

            // Add file size for add/change events
            if (type !== 'unlink') {
                try {
                    const stats = statSync(path);
                    event.size = stats.size;
                } catch (error) {
                    log('Failed to get file stats:', error);
                }
            }

            log('File event:', event);
            this.emit('file-event', event);
            this.emit(`file-${type}`, event);

        } catch (error) {
            log('Error handling file event:', error);
            this.emit('error', error);
        }
    }

    isActive(): boolean {
        return this.isRunning;
    }

    getWatchedPaths(): string[] {
        return this.config.paths;
    }
}
