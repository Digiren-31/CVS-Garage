import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const ignoredDirectories = new Set(['.git', 'node_modules', 'dist', 'coverage']);

function markdownFiles(directory) {
  return readdirSync(directory).flatMap((entry) => {
    if (ignoredDirectories.has(entry)) {
      return [];
    }
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) {
      return markdownFiles(path);
    }
    return path.endsWith('.md') ? [path] : [];
  });
}

const failures = [];
const linkPattern = /\[[^\]]*]\(([^)]+)\)/g;

for (const file of markdownFiles(root)) {
  const source = readFileSync(file, 'utf8');
  for (const match of source.matchAll(linkPattern)) {
    const rawTarget = match[1].trim().replace(/^<|>$/g, '');
    if (
      !rawTarget ||
      rawTarget.startsWith('#') ||
      /^[a-z][a-z\d+.-]*:/i.test(rawTarget)
    ) {
      continue;
    }

    const pathOnly = decodeURIComponent(rawTarget.split('#')[0]);
    const target = resolve(dirname(file), pathOnly);
    if (!existsSync(target)) {
      failures.push(`${file.replace(`${root}/`, '')}: ${rawTarget}`);
    }
  }
}

if (failures.length > 0) {
  console.error('Broken local Markdown links:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('All local Markdown links resolve.');
