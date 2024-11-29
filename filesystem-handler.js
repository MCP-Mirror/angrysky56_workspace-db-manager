import chokidar from 'chokidar';
import path from 'path';
import glob from 'glob';

class FileSystemHandler {
    constructor(rootPaths) {
        this.rootPaths = rootPaths;
        this.watcher = null;
    }

    async setupWatchers() {
        const watchPatterns = this.rootPaths.map(p => path.join(p, '**/*.db'));
        this.watcher = chokidar.watch(watchPatterns, {
            persistent: true,
            ignoreInitial: false,
            depth: Infinity,
            awaitWriteFinish: true
        });

        this.watcher
            .on('add', path => this.handleNewDatabase(path))
            .on('change', path => this.handleDatabaseChange(path))
            .on('unlink', path => this.handleDatabaseRemove(path));
    }

    async scanWorkspace() {
        const databases = [];
        for (const rootPath of this.rootPaths) {
            const pattern = path.join(rootPath, '**/*.db');
            const files = await new Promise((resolve, reject) => {
                glob(pattern, { nodir: true }, (err, files) => {
                    if (err) reject(err);
                    else resolve(files);
                });
            });
            databases.push(...files);
        }
        return databases;
    }

    handleNewDatabase(dbPath) {
        console.log(`New database detected: ${dbPath}`);
        // Emit event for new database
        this.emit('database:new', dbPath);
    }

    handleDatabaseChange(dbPath) {
        console.log(`Database changed: ${dbPath}`);
        // Emit event for database change
        this.emit('database:change', dbPath);
    }

    handleDatabaseRemove(dbPath) {
        console.log(`Database removed: ${dbPath}`);
        // Emit event for database removal
        this.emit('database:remove', dbPath);
    }
}

export default FileSystemHandler;