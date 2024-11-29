# Workspace Database Manager - Setup and Testing Instructions

## Overview
This document provides step-by-step instructions for setting up, testing, and maintaining the Workspace Database Manager MCP server. This server manages multiple SQLite databases across your workspace with automated discovery and monitoring capabilities.

## Installation Steps

1. **Prerequisites**
   ```bash
   # Install Node.js if not already installed
   # Download from https://nodejs.org/

   # Install required global packages
   npm install -g uvx
   ```

2. **Server Setup**
   ```bash
   # Navigate to the server directory
   cd workspace-db-manager

   # Install dependencies
   npm install
   ```

3. **Configuration**
   - Copy `claude_desktop_config.json` to your Claude Desktop configuration location
   - Adjust paths in the configuration file to match your system

## Testing

### Running Basic Tests
```bash
# Run all tests
npm test

# Run tests with watch mode (for development)
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Adding New Tests
1. Create new test files in the `tests` directory
2. Follow the existing test patterns
3. Run tests to verify

## Development Instructions

### Adding Error Handling
1. Define new error codes in `error-handler.js`:
   ```javascript
   static ERROR_CODES = {
     NEW_CATEGORY: {
       NEW_ERROR: 'CODE001'
     }
   }
   ```

2. Create handler methods:
   ```javascript
   handleNewError(error, operation) {
     // Implementation
   }
   ```

### Adding Recovery Mechanisms
1. Add recovery strategy in `error-handler.js`:
   ```javascript
   async recoverFromError(error) {
     // Implementation
   }
   ```

2. Register in recovery map:
   ```javascript
   recoveryStrategies.set(ERROR_CODES.NEW_CATEGORY.NEW_ERROR, recoverFromError);
   ```

### Performance Testing
1. Run built-in performance tests:
   ```bash
   npm run test:performance
   ```

2. Add custom performance tests:
   ```javascript
   // In tests/performance.test.js
   test('performance - database operations', async () => {
     // Implementation
   });
   ```

## Maintenance

### Log Management
- Logs are stored in: `C:/Users/angry/OneDrive/Desktop/ai_workspace/memory/logs/`
- Rotate logs periodically:
  ```bash
  # Example log rotation script
  ./rotate-logs.sh
  ```

### Database Maintenance
- Regular cleanup:
  ```sql
  VACUUM;
  ANALYZE;
  ```
- Check for orphaned databases:
  ```bash
  npm run check-orphaned
  ```

### Monitoring
- Check server status:
  ```bash
  npm run status
  ```
- View active connections:
  ```bash
  npm run list-connections
  ```

## Troubleshooting

### Common Issues

1. **Connection Errors**
   - Check database permissions
   - Verify paths in configuration
   - Check error logs

2. **File Watching Issues**
   - Verify directory permissions
   - Check for file system limits
   - Review watcher logs

3. **Performance Issues**
   - Check connection pool settings
   - Review database indices
   - Monitor system resources

### Recovery Steps

1. **Server Crashes**
   ```bash
   # Restart server
   npm run restart
   
   # Check logs
   npm run check-logs
   ```

2. **Database Corruption**
   ```bash
   # Run integrity check
   npm run db-check
   
   # Repair if needed
   npm run db-repair
   ```

## Additional Features

### Adding New Server Capabilities

1. Create new module:
   ```bash
   npm run create-module -- --name="feature-name"
   ```

2. Implement features:
   ```javascript
   // In new module file
   export class NewFeature {
     // Implementation
   }
   ```

3. Test new features:
   ```bash
   npm run test-module -- --name="feature-name"
   ```

### Integration Testing

1. Run integration tests:
   ```bash
   npm run test:integration
   ```

2. Add new integration scenarios:
   ```javascript
   // In tests/integration/
   test('new scenario', async () => {
     // Implementation
   });
   ```

## Support

For issues or questions:
1. Check the error logs
2. Review the documentation
3. Run diagnostics:
   ```bash
   npm run diagnostics
   ```

Remember to backup your databases regularly and keep the server updated with the latest security patches.