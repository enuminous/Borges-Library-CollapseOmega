const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'engine.js'), 'utf8');
const sandbox = { window: {} };
vm.runInNewContext(source, sandbox, { filename: 'engine.js' });
const engine = sandbox.window.BorgesEngine;

test('the same reader state produces the same room', () => {
  const input = { title: '2001: A Space Odyssey', need: 'Where does intelligence go next?', focus: 'wonder', visited: [], step: 1, lastAction: 'entry' };
  assert.equal(engine.collapse(input).room.id, 'observatory');
  assert.equal(engine.collapse(input).room.id, 'observatory');
});

test('the title and reader lens steer the selected room', () => {
  const space = engine.collapse({ title: 'A Map of the Stars', need: 'What lies beyond this horizon?', focus: 'wonder', visited: [], step: 1 });
  const memory = engine.collapse({ title: 'Archive of a Lost Name', need: 'What do I still remember?', focus: 'memory', visited: [], step: 1 });
  assert.equal(space.room.id, 'observatory');
  assert.equal(memory.room.id, 'archive');
});

test('every room offers three distinct next actions', () => {
  for (const room of engine.ROOMS) {
    const choices = engine.choices(room);
    assert.equal(choices.length, 3);
    assert.equal(new Set(choices.map(choice => choice.id)).size, 3);
    assert.ok(choices.every(choice => choice.label.length > 4));
  }
});

test('the interpreter returns the room-specific fragment for each action', () => {
  const room = engine.ROOMS.find(item => item.id === 'margin');
  const context = { title: 'A Possible Book', need: 'Let the sentence remain open.', focus: 'quiet' };
  assert.match(engine.compose(context, room, 'margin').event, /Do not repair the pause/);
  assert.match(engine.compose(context, room, 'door').event, /paragraph break/);
  assert.match(engine.compose(context, room, 'librarian').event, /remain beginnings/);
});
