# WIP: Caution!!! AI code and probably wrong in many ways though it "runs".

# Workspace DB Manager

[![CI](https://github.com/angrysky56/workspace-db-manager/actions/workflows/ci.yml/badge.svg)](https://github.com/angrysky56/workspace-db-manager/actions/workflows/ci.yml)

A TypeScript MCP (Model Context Protocol) server for managing workspace databases with filesystem integration.

## Features

- SQLite database management with automatic discovery
- Real-time filesystem monitoring for database changes
- Database connection pooling and management
- Automatic database tracking and status updates
- Cross-database operations support
- TypeScript/ES Module architecture

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Build the TypeScript code:
```bash
npm run build
```

3. Initialize the core database:
```bash
npm run init-db
```

4. Start the server:
```bash
npm start
```

## Development

```bash
# Run in development mode with auto-reload
npm run dev

# Run tests
npm test

# Build TypeScript
npm run build
```

## Continuous Integration

This project uses GitHub Actions for continuous integration:

- Runs on Node.js 20.x, 21.x, and 22.x
- Automatically runs tests on every push and pull request
- Checks TypeScript compilation
- Generates and uploads test coverage reports
- Fails if code quality standards are not met

## Configuration

The server can be configured through a WorkspaceConfig object:

```typescript
const manager = new WorkspaceDBManager({
    watchPaths: ['/path/to/workspace'],
    pollInterval: 1000, // Optional: file system polling interval
    database: {
        verbose: true // Optional: enable verbose database logging
    }
});
```

## Database Operations

### Automatic Database Discovery
The server automatically detects and tracks:
- New database files
- Database modifications
- Database removals

### Database Management
```typescript
// List all managed databases
const databases = await manager.listManagedDatabases();

// Get system configuration
const config = await manager.getConfig('some_key');
```

### Events
The server emits events for various operations:
- `database-added`: When a new database is discovered
- `database-changed`: When a database is modified
- `database-removed`: When a database is removed
- `error`: When an error occurs
- `initialized`: When the server is fully initialized

## Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

ISC
