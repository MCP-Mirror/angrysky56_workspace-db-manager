// Database configuration types
export interface DatabaseConfig {
    verbose?: boolean;
    pool?: {
        max?: number;
        idle?: number;
    };
}

// Schema definition types
export interface TableSchema {
    name: string;
    columns: ColumnDefinition[];
    indexes?: IndexDefinition[];
}

export interface ColumnDefinition {
    name: string;
    type: string;
    constraints?: string;
}

export interface IndexDefinition {
    name: string;
    columns: string[];
    unique?: boolean;
}

export interface DatabaseSchema {
    tables: TableSchema[];
}

// Database record types
export interface ManagedDatabase {
    id: number;
    name: string;
    path: string;
    alias?: string;
    created_at: string;
    last_accessed?: string;
    status: 'connected' | 'disconnected' | 'error' | 'removed';
}

export interface SystemConfig {
    config_key: string;
    config_value: string;
    last_modified: string;
}

// Function return types
export type DatabaseQueryResult<T> = T | undefined;
export type DatabaseQueryArrayResult<T> = T[];