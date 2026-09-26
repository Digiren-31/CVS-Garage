import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { relative, resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const results = await Promise.all(entries.filter((e) => !['node_modules', 'dist', '.git'].includes(e.name)).map((e) => e.isDirectory() ? files(resolve(directory, e.name)) : resolve(directory, e.name)));
  return results.flat();
}
const violations = [];
for (const folder of ['apps/portal/src', 'services', 'packages']) {
  for (const file of await files(resolve(root, folder))) {
    if (!/\.(ts|tsx|js)$/.test(file)) continue;
    const content = await readFile(file, 'utf8');
    for (const match of content.matchAll(/(?:from\s*|import\s*\()\s*['"]([^'"]+)['"]/g)) {
      const name = relative(root, file).replaceAll('\\', '/');
      const target = match[1];
      if (folder === 'services' && /(?:apps\/portal|backend\/|\.\.\/\.\.\/(?:projects|events|forum|member-centre|leaderboards|idea-centre)\/)/.test(target)) violations.push(`${name}: ${target}`);
      if (folder === 'packages' && /(?:services\/|apps\/|backend\/)/.test(target)) violations.push(`${name}: ${target}`);
      if (folder === 'apps/portal/src' && /services\/.*\/src\//.test(target)) violations.push(`${name}: private service import ${target}`);
    }
  }
}
if (violations.length) throw new Error(`Dependency boundary violations:\n${violations.join('\n')}`);
console.log('Frontend dependency boundary check passed.');
