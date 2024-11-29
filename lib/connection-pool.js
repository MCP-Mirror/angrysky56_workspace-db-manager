import { AsyncDatabase } from './sqlite-wrapper.js';

class ConnectionPool {
    constructor(config = {}) {
        this.maxConnections = config.maxConnections || 10;
        this.timeout = config.timeout || 5000;
        this.cleanupInterval = config.cleanupInterval || 30000;
        this.pool = new Map();
        this.waiting = [];
        
        // Start cleanup interval
        this.cleanupTimer = setInterval(() => this.cleanup(), this.cleanupInterval);
    }

    async acquire(dbPath) {
        const poolEntry = this.pool.get(dbPath);
        
        if (poolEntry?.connection && !poolEntry.inUse) {
            poolEntry.inUse = true;
            poolEntry.lastUsed = Date.now();
            return poolEntry.connection;
        }

        if (this.pool.size >= this.maxConnections) {
            return new Promise((resolve, reject) => {
                const timeoutId = setTimeout(() => {
                    const index = this.waiting.findIndex(w => w.dbPath === dbPath);
                    if (index !== -1) {
                        this.waiting.splice(index, 1);
                        reject(new Error('Connection timeout'));
                    }
                }, this.timeout);

                this.waiting.push({
                    dbPath,
                    resolve,
                    reject,
                    timeoutId
                });
            });
        }

        try {
            const connection = new AsyncDatabase(dbPath);
            await connection.connect();

            this.pool.set(dbPath, {
                connection,
                inUse: true,
                lastUsed: Date.now()
            });

            return connection;
        } catch (error) {
            throw new Error(`Failed to create connection: ${error.message}`);
        }
    }

    async release(dbPath) {
        const poolEntry = this.pool.get(dbPath);
        if (poolEntry) {
            poolEntry.inUse = false;
            poolEntry.lastUsed = Date.now();

            // Check waiting queue
            const waiting = this.waiting.find(w => w.dbPath === dbPath);
            if (waiting) {
                clearTimeout(waiting.timeoutId);
                this.waiting = this.waiting.filter(w => w !== waiting);
                poolEntry.inUse = true;
                waiting.resolve(poolEntry.connection);
            }
        }
    }

    async cleanup(maxIdle = 30000) {
        const now = Date.now();
        const promises = [];

        for (const [dbPath, entry] of this.pool.entries()) {
            if (!entry.inUse && (now - entry.lastUsed) > maxIdle) {
                promises.push(
                    entry.connection.close()
                        .then(() => this.pool.delete(dbPath))
                        .catch(error => console.error(`Failed to close connection: ${error.message}`))
                );
            }
        }

        await Promise.allSettled(promises);
    }

    async shutdown() {
        clearInterval(this.cleanupTimer);
        
        // Close all connections
        const promises = Array.from(this.pool.values())
            .map(entry => entry.connection.close()
                .catch(error => console.error(`Failed to close connection: ${error.message}`))
            );

        await Promise.allSettled(promises);
        this.pool.clear();
        this.waiting.forEach(w => {
            clearTimeout(w.timeoutId);
            w.reject(new Error('Pool shutdown'));
        });
        this.waiting = [];
    }
}

export { ConnectionPool };