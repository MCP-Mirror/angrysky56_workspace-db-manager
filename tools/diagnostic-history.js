import { DatabaseManager } from '../database-manager.js';
import { ErrorHandler } from '../error-handler.js';

class DiagnosticHistory {
    constructor() {
        this.dbManager = new DatabaseManager();
        this.errorHandler = new ErrorHandler();
    }

    async initializeHistoryTable() {
        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS diagnostic_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                diagnostic_type TEXT,
                status TEXT,
                details JSON,
                resolved BOOLEAN DEFAULT FALSE,
                resolution_details JSON,
                resolution_timestamp DATETIME
            )
        `;
        
        const createIndexSQL = `
            CREATE INDEX IF NOT EXISTS idx_diagnostic_timestamp 
            ON diagnostic_history(timestamp)
        `;

        try {
            await this.dbManager.executeQuery(createTableSQL);
            await this.dbManager.executeQuery(createIndexSQL);
        } catch (error) {
            throw this.errorHandler.handleDatabaseError(error, 'initialize_history_table');
        }
    }

    async saveDiagnosticResult(result) {
        const insertSQL = `
            INSERT INTO diagnostic_history 
            (diagnostic_type, status, details) 
            VALUES (?, ?, ?)
        `;

        try {
            await this.dbManager.executeQuery(insertSQL, [
                result.type,
                result.status,
                JSON.stringify(result.details)
            ]);
        } catch (error) {
            throw this.errorHandler.handleDatabaseError(error, 'save_diagnostic_result');
        }
    }

    async getHistoricalTrends() {
        const sql = `
            SELECT 
                DATE(timestamp) as date,
                diagnostic_type,
                COUNT(*) as total_runs,
                SUM(CASE WHEN status = 'ERROR' THEN 1 ELSE 0 END) as error_count,
                SUM(CASE WHEN resolved = TRUE THEN 1 ELSE 0 END) as resolved_count
            FROM diagnostic_history
            GROUP BY DATE(timestamp), diagnostic_type
            ORDER BY date DESC, diagnostic_type
        `;

        try {
            return await this.dbManager.executeQuery(sql);
        } catch (error) {
            throw this.errorHandler.handleDatabaseError(error, 'get_historical_trends');
        }
    }

    async getRecurringIssues() {
        const sql = `
            SELECT 
                diagnostic_type,
                json_extract(details, '$.error_code') as error_code,
                COUNT(*) as occurrence_count
            FROM diagnostic_history
            WHERE status = 'ERROR'
            AND timestamp > datetime('now', '-7 days')
            GROUP BY diagnostic_type, json_extract(details, '$.error_code')
            HAVING COUNT(*) > 1
            ORDER BY occurrence_count DESC
        `;

        try {
            return await this.dbManager.executeQuery(sql);
        } catch (error) {
            throw this.errorHandler.handleDatabaseError(error, 'get_recurring_issues');
        }
    }

    async updateResolution(id, resolutionDetails) {
        const sql = `
            UPDATE diagnostic_history
            SET resolved = TRUE,
                resolution_details = ?,
                resolution_timestamp = CURRENT_TIMESTAMP
            WHERE id = ?
        `;

        try {
            await this.dbManager.executeQuery(sql, [
                JSON.stringify(resolutionDetails),
                id
            ]);
        } catch (error) {
            throw this.errorHandler.handleDatabaseError(error, 'update_resolution');
        }
    }
}

export { DiagnosticHistory };