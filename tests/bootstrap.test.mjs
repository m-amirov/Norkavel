import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (path) => readFileSync(join(root, path), 'utf8');

test('Ludory project metadata is canonical and Yandex-only at bootstrap', () => {
  const game = JSON.parse(read('ludory.project.json'));
  assert.equal(game.schemaVersion, 1);
  assert.equal(game.id, 'norkavel');
  assert.equal(game.engine, 'phaser');
  assert.deepEqual(game.targets, ['yandex-games']);
  assert.deepEqual(game.title, {ru: 'Норкавель', en: 'Norkavel'});
});

test('submodule sources are fixed to reviewed repositories', () => {
  const modules = read('.gitmodules');
  assert.match(modules, /path = vendor\/ludory\s/);
  assert.match(modules, /url = https:\/\/github\.com\/m-amirov\/ludory\.git/);
  assert.match(modules, /path = vendor\/workflow-for-agents\s/);
  assert.match(modules, /url = https:\/\/github\.com\/m-amirov\/workflow-for-agents\.git/);
});

test('GDD preserves hard PvP and party requirements', () => {
  const text = read('docs/GDD-1.0.md');
  assert.match(text, /асинхронн/iu);
  assert.match(text, /один главн/iu);
  assert.match(text, /тр[её]х (?:активных )?спутник/iu);
  assert.match(text, /вид(?:ом)? сбоку/iu);
  assert.match(text, /только в альбомной.*landscape/iu);
  assert.match(text, /Поверните устройство/iu);
});
