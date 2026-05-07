import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function ensureDir(dirPath: string): Promise<void> {
  await mkdir(dirPath, { recursive: true });
}

export async function readText(filePath: string): Promise<string> {
  return readFile(filePath, 'utf8');
}

export async function writeText(filePath: string, content: string): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await writeFile(filePath, content, 'utf8');
}

export async function writeJson(filePath: string, value: unknown): Promise<void> {
  await writeText(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export function toPosix(filePath: string): string {
  return filePath.split(path.sep).join('/');
}

export function relativePath(rootDir: string, filePath: string): string {
  return toPosix(path.relative(rootDir, filePath));
}

export function timestampStamp(date = new Date()): string {
  return date.toISOString().replace(/[:]/g, '-').replace(/\..+$/, 'Z');
}

export async function walkFiles(
  rootDir: string,
  options: {
    include?: (filePath: string) => boolean;
    ignoreDirs?: Set<string>;
  } = {},
): Promise<string[]> {
  const { include, ignoreDirs = new Set<string>() } = options;
  const results: string[] = [];

  async function visit(currentDir: string): Promise<void> {
    const entries = await readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (ignoreDirs.has(entry.name)) {
          continue;
        }
        await visit(fullPath);
        continue;
      }
      if (!include || include(fullPath)) {
        results.push(fullPath);
      }
    }
  }

  await visit(rootDir);
  return results.sort((a, b) => a.localeCompare(b));
}

export function getLineNumber(content: string, snippet: string): number {
  const index = content.indexOf(snippet);
  if (index === -1) {
    return 1;
  }
  return content.slice(0, index).split('\n').length;
}

export function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

export function pickImpactLevel(score: number): 'low' | 'medium' | 'high' {
  if (score >= 4) {
    return 'high';
  }
  if (score >= 2.5) {
    return 'medium';
  }
  return 'low';
}

export function parseInteger(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}
