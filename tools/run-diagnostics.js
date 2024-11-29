        let report = `
=== SAGE SYSTEM DIAGNOSTIC REPORT ===
Timestamp: ${diagnostics.timestamp}
Execution Time: ${diagnostics.execution_time}ms

1. SERVER STATUS
${this.formatServerStatus(diagnostics.servers)}

2. DATABASE HEALTH
${this.formatDatabaseHealth(diagnostics.databases)}

3. FRAMEWORK STATUS
${this.formatFrameworkStatus(diagnostics.frameworks)}

4. ERROR REPORT
${this.formatErrorReport(diagnostics.errors)}

5. ANOMALY DETECTION
${this.formatAnomalies(diagnostics.anomalies)}

6. RESOURCE UTILIZATION
${this.formatResources(diagnostics.resources)}

7. BACKUP SYSTEMS
${this.formatBackupStatus(diagnostics.backups)}

8. RECOVERY READINESS
${this.formatRecoveryStatus(diagnostics.recovery)}

9. HISTORICAL TRENDS
${this.formatHistoricalTrends(diagnostics.historical_trends)}

10. AUTO-RESOLUTION SUMMARY
${this.formatAutoResolutions(diagnostics.auto_resolutions)}

=== ACTION ITEMS ===
${this.generateActionItems(diagnostics)}

=== RECOMMENDATIONS ===
${this.generateRecommendations(diagnostics)}
`;

        return report;
    }

    formatHistoricalTrends(trends) {
        if (!trends || Object.keys(trends).length === 0) {
            return 'No historical data available';
        }

        let report = 'Last 7 Days Summary:\n';
        
        // Error rate trends
        report += '\nError Rate Trends:\n';
        report += trends.error_rates.map(day => 
            `${day.date}: ${day.error_count} errors (${day.resolution_rate}% resolved)`
        ).join('\n');

        // Performance trends
        report += '\n\nPerformance Trends:\n';
        report += trends.performance.map(day =>
            `${day.date}: Avg response time ${day.avg_response_time}ms`
        ).join('\n');

        // Issue patterns
        if (trends.recurring_issues.length > 0) {
            report += '\n\nRecurring Issues:\n';
            report += trends.recurring_issues.map(issue =>
                `- ${issue.type}: ${issue.count} occurrences`
            ).join('\n');
        }

        return report;
    }

    formatAutoResolutions(resolutions) {
        if (!resolutions || Object.keys(resolutions).length === 0) {
            return 'No auto-resolutions attempted';
        }

        let report = `
Auto-Resolution Summary:
- Attempted: ${resolutions.attempted}
- Successful: ${resolutions.successful}
- Failed: ${resolutions.failed}

Detailed Results:`;

        resolutions.details.forEach(detail => {
            report += `\n- Issue: ${detail.issue.message}`;
            report += `\n  Strategy: ${detail.strategy}`;
            report += `\n  Outcome: ${detail.result.map(r => 
                `${r.step.action}: ${r.status}`
            ).join(', ')}`;
        });

        return report;
    }

    generateRecommendations(diagnostics) {
        const recommendations = [];

        // Check server health
        if (diagnostics.servers.inactive.length > 0) {
            recommendations.push('Consider implementing server redundancy for critical services');
        }

        // Check database performance
        if (diagnostics.databases.performance?.slow_queries > 0) {
            recommendations.push('Review and optimize database queries showing slow performance');
        }

        // Check resource utilization
        if (diagnostics.resources.memory_usage > 80) {
            recommendations.push('Consider increasing memory allocation or implementing better memory management');
        }

        // Check backup frequency
        const lastBackup = new Date(diagnostics.backups.last_backup);
        const daysSinceBackup = (new Date() - lastBackup) / (1000 * 60 * 60 * 24);
        if (daysSinceBackup > 1) {
            recommendations.push('Increase backup frequency to maintain better data safety');
        }

        // Historical trends analysis
        if (diagnostics.historical_trends.recurring_issues?.length > 0) {
            recommendations.push('Implement preventive measures for frequently occurring issues');
        }

        return recommendations.length > 0 
            ? recommendations.join('\n') 
            : 'No specific recommendations at this time';
    }
}

export { DiagnosticRunner };