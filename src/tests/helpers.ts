import { join } from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { existsSync } from 'fs';

export async function ensureTestDirectory(dirPath: string): Promise<void> {
    if (!existsSync(dirPath)) {
        try {
            await mkdir(dirPath, { recursive: true });
        } catch (error: any) {
            if (error.code !== 'EEXIST') {
                throw error;
            }
        }
    }
}

export async function createTestFile(path: string, content: string = ''): Promise<void> {
    await writeFile(path, content);
}

export function getTestDirectory(): string {
    // Use system temp directory in CI, local directory otherwise
    return process.env.CI 
        ? join(process.env.GITHUB_WORKSPACE || process.cwd(), 'test-workspace')
        : join(process.cwd(), 'test-workspace');
}