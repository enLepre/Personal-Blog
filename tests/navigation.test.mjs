import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

test('menu opens only on activation and supports dismissal and client navigation', () => {
  const makeElement = () => ({
    dataset: {}, events: {}, attrs: {}, classes: new Set(),
    addEventListener(name, handler) { this.events[name] = handler; },
    setAttribute(name, value) { this.attrs[name] = value; },
    contains(element) { return [this, toggle, nav].includes(element); },
    focus() { document.activeElement = this; this.events.focus?.(); }
  });
  const menu = makeElement(), toggle = makeElement(), nav = makeElement();
  menu.classList = { toggle(name, enabled) { enabled ? menu.classes.add(name) : menu.classes.delete(name); }, contains(name) { return menu.classes.has(name); } };
  menu.querySelector = selector => selector === 'nav' ? nav : toggle;
  const document = { activeElement: null, events: {}, querySelector: () => menu, addEventListener(name, handler) { this.events[name] = handler; } };
  vm.runInNewContext(readFileSync('src/scripts/navigation.js', 'utf8'), { document, AbortController });
  // Focus alone must not reveal the links; click/tap or keyboard activation does.
  toggle.focus();
  assert.equal(menu.classes.has('is-open'), false);
  toggle.events.click();
  assert.equal(toggle.attrs['aria-expanded'], 'true');
  assert.equal(toggle.attrs['aria-label'], 'Close navigation');
  assert.equal(nav.inert, false);
  toggle.events.click();
  assert.equal(nav.inert, true);
  toggle.events.click();
  menu.events.keydown({ key: 'Escape' });
  assert.equal(nav.inert, true);
  assert.equal(document.activeElement, toggle);
  toggle.events.click();
  document.events.pointerdown({ target: {} });
  assert.equal(nav.inert, true);
  document.events['astro:before-swap']();
  menu.dataset = {};
  document.events['astro:page-load']();
  toggle.events.click();
  assert.equal(nav.inert, false);
});

test('transition compares loaded Markdown levels, including direct article-to-home links', async () => {
  const events = {};
  const document = { body: { dataset: {} }, querySelector: () => null, addEventListener(name, handler) { events[name] = handler; } };
  vm.runInNewContext(readFileSync('src/scripts/navigation.js', 'utf8'), { document, AbortController });
  const direction = async (current, next, initial = 'forward') => {
    document.body.dataset.pageLevel = String(current);
    let loaded = false;
    const event = { direction: initial, newDocument: document, loader: async () => {
      loaded = true;
      event.newDocument = { body: { dataset: { pageLevel: String(next) } } };
    } };
    events['astro:before-preparation'](event);
    await event.loader();
    assert.equal(loaded, true);
    return event.direction;
  };
  assert.equal(await direction(1, 2), 'forward');
  assert.equal(await direction(2, 3), 'forward');
  assert.equal(await direction(3, 2), 'back');
  assert.equal(await direction(2, 1), 'back');
  assert.equal(await direction(3, 1), 'back');
  // Edited levels override route structure and browser-history direction.
  assert.equal(await direction(5, 1), 'back');
  assert.equal(await direction(1, 7, 'back'), 'forward');
  assert.equal(await direction(2, 2), 'forward');
  assert.equal(await direction(2, 2, 'back'), 'back');
  assert.equal(await direction(3, undefined, 'back'), 'back');
});
