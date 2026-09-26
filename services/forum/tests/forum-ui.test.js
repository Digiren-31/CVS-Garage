/**
 * CVS Garage — Forum Frontend & Asset Integration Tests
 * Runs with Node native test runner: node tests/forum-ui.test.js
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const forumDir = path.resolve(__dirname, '..');

test('Forum Frontend Structure & Asset Verification', async (t) => {
  await t.test('1. Core Assets Exist', () => {
    assert.ok(fs.existsSync(path.join(forumDir, 'index.html')), 'index.html must exist');
    assert.ok(fs.existsSync(path.join(forumDir, 'src/styles/theme.css')), 'theme.css must exist');
    assert.ok(fs.existsSync(path.join(forumDir, 'src/styles/forum.css')), 'forum.css must exist');
    assert.ok(fs.existsSync(path.join(forumDir, 'src/app.js')), 'app.js must exist');
    assert.ok(fs.existsSync(path.join(forumDir, 'src/api.js')), 'api.js must exist');
  });

  await t.test('2. Orange Theme Tokens & Google Sans Typography', () => {
    const themeCss = fs.readFileSync(path.join(forumDir, 'src/styles/theme.css'), 'utf-8');
    assert.ok(themeCss.includes('#ea580c') || themeCss.includes('#EA580C'), 'Brand orange #EA580C must be defined');
    assert.ok(themeCss.includes('Google Sans'), 'Google Sans font family must be declared');
  });

  await t.test('3. Semantic HTML & Modal Mounts', () => {
    const html = fs.readFileSync(path.join(forumDir, 'index.html'), 'utf-8');
    assert.ok(html.includes('global-search'), 'Search input must exist');
    assert.ok(html.includes('role-switcher-select'), 'Role switcher select must exist');
    assert.ok(html.includes('global-modal-container'), 'Global modal container must exist');
    assert.ok(html.includes('toast-container'), 'Toast container must exist');
  });
});
