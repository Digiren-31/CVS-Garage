import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

function collectJavaScriptFiles(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory()
      ? collectJavaScriptFiles(path)
      : path.endsWith('.js')
        ? [path]
        : [];
  });
}

const files = [
  ...collectJavaScriptFiles(new URL('../src', import.meta.url).pathname),
  ...collectJavaScriptFiles(new URL('../tests', import.meta.url).pathname)
];

for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], {
    encoding: 'utf8'
  });

  if (result.status !== 0) {
    process.stderr.write(result.stderr);
    process.exit(result.status ?? 1);
  }
}

process.env.NODE_ENV = 'test';
await import('../src/server.js');

console.log(`Validated ${files.length} backend JavaScript files and server module wiring.`);
