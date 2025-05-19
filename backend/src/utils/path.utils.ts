import path from 'path';

export function getAbsolutePath(baseDir: string, relativePath: string = ''): string {
    return path.resolve(baseDir, relativePath);
}
