import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { defineGame, createGameSession } from '../vendor/ludory/packages/core/src/index.mjs';

const manifest = JSON.parse(readFileSync(new URL('../ludory.project.json', import.meta.url), 'utf8'));
const definition = defineGame(manifest);
assert.equal(definition.id, 'norkavel');
assert.deepEqual(definition.targets, ['yandex-games']);

const onUpdate = ({ state, setState }) => setState({ ticks: state.ticks + 1 });
const session = createGameSession({ definition, initialState: { ticks: 0 }, onUpdate });
session.initialize();
session.start();
session.tick(16.67);
session.pause();
const saved = session.snapshot();
assert.equal(saved.state.ticks, 1);
session.stop();

const restored = createGameSession({ definition, initialState: { ticks: 0 }, onUpdate });
restored.initialize();
restored.restore(saved);
restored.start();
restored.tick(16.67);
assert.equal(restored.snapshot().state.ticks, 2);
console.log('LUDORY_CORE_SMOKE_PASS: norkavel definition, lifecycle, save/restore');
