import test from 'node:test';
import assert from 'node:assert/strict';
import { newestFirst } from '../src/lib/sort.mjs';
test('sorts publication dates descending, preserves input, and breaks ties by id', () => {
  const entry = (id, date) => ({ id, data: { date: new Date(date) } });
  const input = [entry('old', '2020-01-01'), entry('b', '2026-10-01'), entry('new', '2026-10-07'), entry('a', '2026-10-01')];
  assert.deepEqual(newestFirst(input).map(e => e.id), ['new', 'a', 'b', 'old']);
  assert.equal(input[0].id, 'old');
  assert.deepEqual(newestFirst([]), []);
});

import vm from 'node:vm';
import { readFileSync } from 'node:fs';
test('scroll tracking follows the two-thirds threshold in both directions', () => {
  const ids = ['home', 'research', 'notes', 'essays', 'about'];
  const positions = [0, 800, 1600, 2400, 3200];
  const links = ids.map(id => ({ dataset: { nav: id }, active: false, attrs: {}, classList: { toggle(_, active) { links.find(l => l.dataset.nav === id).active = active; } }, setAttribute(k,v) { this.attrs[k] = v; }, removeAttribute(k) { delete this.attrs[k]; } }));
  const sections = ids.map((id,i) => ({ querySelector() { return { getBoundingClientRect() { return { top: positions[i] }; } }; } }));
  const listeners = {};
  const context = { document: { body: { dataset: { page: 'home' } }, querySelectorAll: () => links, querySelector: () => sections[0], getElementById: id => sections[ids.indexOf(id)] }, window: { innerHeight: 900, addEventListener: (event,fn) => { listeners[event] = fn; } }, requestAnimationFrame: fn => fn() };
  vm.runInNewContext(readFileSync('src/scripts/navigation.js','utf8'), context);
  assert.equal(links.find(l => l.active).dataset.nav, 'home');
  positions[1] = 600; listeners.scroll();
  assert.equal(links.find(l => l.active).dataset.nav, 'research');
  positions[2] = 600; listeners.scroll();
  assert.equal(links.find(l => l.active).dataset.nav, 'notes');
  positions[2] = 601; listeners.scroll();
  assert.equal(links.find(l => l.active).dataset.nav, 'research');
  assert.equal(links.filter(l => l.attrs['aria-current'] === 'location').length, 1);
});
