import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

test('menu supports hover, touch, keyboard dismissal, and client navigation', () => {
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
  menu.events.pointerenter({ pointerType: 'mouse' });
  assert.equal(toggle.attrs['aria-expanded'], 'true');
  assert.equal(nav.inert, false);
  menu.events.pointerleave({ pointerType: 'mouse' });
  assert.equal(nav.inert, true);
  // Touch focus occurs before click; the first tap must still open the menu.
  toggle.events.pointerdown(); toggle.focus(); toggle.events.click({ detail: 1 });
  assert.equal(nav.inert, false);
  toggle.events.pointerdown(); toggle.events.click({ detail: 1 });
  assert.equal(nav.inert, true);
  toggle.focus();
  menu.events.keydown({ key: 'Escape' });
  assert.equal(nav.inert, true);
  assert.equal(document.activeElement, toggle);
  menu.events.pointerenter({ pointerType: 'mouse' });
  document.events.pointerdown({ target: {} });
  assert.equal(nav.inert, true);
  document.events['astro:before-swap']();
  menu.dataset = {};
  document.events['astro:page-load']();
  toggle.events.pointerdown(); toggle.events.click({ detail: 1 });
  assert.equal(nav.inert, false);
});
