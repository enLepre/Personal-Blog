import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/scripts/theme.js', 'utf8');
function setup({ stored = null, dark = false, blocked = false } = {}) {
  const events = {}, windowEvents = {}, values = new Map();
  if (stored !== null) values.set('personal-blog-theme', stored);
  const makeDocument = () => ({ documentElement: { dataset: {}, style: {} }, select: {},
    querySelector() { return this.select; }, addEventListener(name, fn) { (events[name] ||= []).push(fn); } });
  const document = makeDocument();
  const system = { matches: dark, addEventListener(name, fn) { this.change = fn; } };
  const window = { matchMedia: () => system, addEventListener(name, fn) { windowEvents[name] = fn; } };
  const localStorage = {
    getItem(key) { if (blocked) throw Error('blocked'); return values.get(key) ?? null; },
    setItem(key, value) { if (blocked) throw Error('blocked'); values.set(key, value); },
    removeItem(key) { if (blocked) throw Error('blocked'); values.delete(key); },
  };
  const context = vm.createContext({ window, document, localStorage });
  vm.runInContext(source, context);
  const fire = (name, event) => events[name].forEach(fn => fn(event));
  const choose = value => fire('change', { target: { id: 'theme-select', value } });
  return { document, system, windowEvents, values, choose, fire, makeDocument, context, events };
}

test('uses the system default, tracks it, and ignores invalid saved values', () => {
  for (const stored of [null, 'invalid']) {
    const s = setup({ stored, dark: true });
    assert.equal(s.document.documentElement.dataset.theme, 'dark');
    assert.equal(s.document.select.value, 'system');
    s.system.matches = false; s.system.change();
    assert.equal(s.document.documentElement.dataset.theme, 'light');
  }
});

test('persists explicit preferences and can return to the system default', () => {
  const s = setup({ stored: 'light', dark: true });
  assert.equal(s.document.documentElement.dataset.theme, 'light');
  s.choose('dark');
  assert.equal(s.values.get('personal-blog-theme'), 'dark');
  s.system.matches = false; s.system.change();
  assert.equal(s.document.documentElement.dataset.theme, 'dark');
  s.choose('system');
  assert.equal(s.values.has('personal-blog-theme'), false);
  assert.equal(s.document.documentElement.dataset.theme, 'light');
});

test('survives unavailable storage and updates Astro destinations before swapping', () => {
  const s = setup({ blocked: true });
  s.choose('dark');
  const next = s.makeDocument();
  s.fire('astro:before-swap', { newDocument: next });
  assert.equal(next.documentElement.dataset.theme, 'dark');
  assert.equal(next.documentElement.style.colorScheme, 'dark');
  assert.equal(next.select.value, 'dark');
  s.fire('astro:page-load');
  vm.runInContext(source, s.context);
  assert.equal(s.events.change.length, 1);
  assert.equal(s.document.select.value, 'dark');
});

test('synchronizes another tab and storage clearing', () => {
  const s = setup();
  s.windowEvents.storage({ key: 'personal-blog-theme', newValue: 'dark' });
  assert.equal(s.document.documentElement.dataset.theme, 'dark');
  s.windowEvents.storage({ key: 'other-key', newValue: 'light' });
  assert.equal(s.document.documentElement.dataset.theme, 'dark');
  s.windowEvents.storage({ key: null, newValue: null });
  assert.equal(s.document.select.value, 'system');
});
