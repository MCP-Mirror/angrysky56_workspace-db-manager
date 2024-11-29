# Sage System Diagnostic Report Template

## 1. Server Status Check
```sql
-- Check active MCP servers
SELECT * FROM active_mcp_servers;

-- Verify server configurations
SELECT * FROM mcp_server_templates WHERE active = 1;
```

Expected Output Format:
```
MCP SERVERS STATUS:
✓ sqlite [ACTIVE] - core.db connected
✓ filesystem [ACTIVE] - monitoring 6 directories
✓ postgres [ACTIVE] - connection stable
✓ memory [ACTIVE] - 4GB available
✓ puppeteer [ACTIVE] - browser ready
✓ brave-search [ACTIVE] - API connected
✓ google-maps [ACTIVE] - API responsive
✓ fetch [ACTIVE] - ready
✓ workspace-db-manager [ACTIVE] - managing databases
⚠ [List any inactive or error state servers]

Available Tools: 40/40
Memory Usage: XX%
Response Time: XXms
```

## 2. Database Health Check
```sql
-- Core Database Status
SELECT 
    'core.db' as db_name,
    COUNT(*) as table_count,
    MAX(last_modified) as last_update
FROM system_config;

-- Check backup status
SELECT * FROM fs_entries WHERE entry_type = 'backup' ORDER BY timestamp DESC LIMIT 1;
```

Expected Output Format:
```
DATABASE STATUS:
core.db:
- Tables: XX/XX online
- Last Update: [timestamp]
- Backup Status: [timestamp]
- Integrity: [OK/WARNING]

Connected Databases:
- TylerBlaineHall.db [status]
- [Other active databases]

Backup Systems:
- Last Backup: [timestamp]
- Backup Location: [path]
- Auto-backup: [ACTIVE/INACTIVE]
```

## 3. Framework Integrity
```sql
-- Check essential frameworks
SELECT * FROM system_config WHERE config_key LIKE '%framework%';

-- Verify behavior systems
SELECT COUNT(*) as active_behaviors FROM ai_behaviors WHERE active = 1;
```

Expected Output Format:
```
FRAMEWORK STATUS:
✓ Ethical Framework [ACTIVE]
✓ Anti-Hallucination [ACTIVE]
✓ Emotional Processing [ACTIVE]
✓ Meta Learning [ACTIVE]

Active Behaviors: XX/XX
Learning Patterns: XX active
Validation Systems: All checks passing
```

## 4. Error Report
```sql
-- Recent Errors
SELECT * FROM error_handler 
WHERE timestamp > (DATETIME('now', '-1 hour'))
ORDER BY severity DESC;
```

Expected Output Format:
```
SYSTEM ALERTS:
Critical: XX
Warnings: XX
Notices: XX

Recent Issues:
- [List of any recent errors with timestamps]
- [Automatic recovery attempts]
- [Success/Failure status]
```

## 5. Anomaly Detection
```sql
-- Check for unusual patterns
SELECT * FROM learning_patterns 
WHERE confidence_score < 0.8
AND timestamp > (DATETIME('now', '-24 hours'));
```

Expected Output Format:
```
ANOMALY REPORT:
Detected Anomalies: XX
- [List significant deviations]
- [Automatic adjustments made]
- [Recommendations]

Pattern Analysis:
- Interaction Patterns: [NORMAL/ANOMALOUS]
- Learning Rate: [NORMAL/ANOMALOUS]
- Response Times: [NORMAL/ANOMALOUS]
```

## 6. Resource Utilization
```sql
-- Check system resources
SELECT * FROM meta_learning 
WHERE learning_type = 'resource_optimization'
ORDER BY created_at DESC LIMIT 1;
```

Expected Output Format:
```
RESOURCE STATUS:
Memory Allocation:
- Database Cache: XX%
- Processing Queue: XX items
- Connection Pool: XX/XX active

Performance Metrics:
- Query Response: XXms avg
- File Access: XXms avg
- API Response: XXms avg
```

## 7. Backup Systems
```sql
-- Verify backup integrity
SELECT * FROM fs_entries 
WHERE entry_type = 'backup_verification'
ORDER BY timestamp DESC LIMIT 1;
```

Expected Output Format:
```
BACKUP STATUS:
Automated Backups:
- Schedule: Every XX hours
- Last Success: [timestamp]
- Next Scheduled: [timestamp]

Redundancy:
- Primary: [status]
- Secondary: [status]
- Emergency: [status]
```

## 8. Recovery Readiness
```sql
-- Check recovery systems
SELECT * FROM ai_behaviors 
WHERE behavior_id LIKE '%recovery%'
AND active = 1;
```

Expected Output Format:
```
RECOVERY SYSTEMS:
✓ Database Recovery [READY]
✓ Framework Recovery [READY]
✓ Connection Recovery [READY]
✓ Error Recovery [READY]

Last Recovery Test: [timestamp]
Success Rate: XX%
```

## Action Items:
- [List any systems requiring attention]
- [Recommended maintenance tasks]
- [Upcoming scheduled tasks]
- [Security updates needed]

Note: This diagnostic report should be generated at startup and available on demand through appropriate commands.