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

test('transition direction follows hierarchy for links and browser history', () => {
  const events = {};
  const document = { querySelector: () => null, addEventListener(name, handler) { events[name] = handler; } };
  vm.runInNewContext(readFileSync('src/scripts/navigation.js', 'utf8'), { document, AbortController });
  const direction = (from, to, initial = 'forward') => {
    const event = { from: new URL(from, 'https://enlepre.github.io'), to: new URL(to, 'https://enlepre.github.io'), direction: initial };
    events['astro:before-preparation'](event);
    return event.direction;
  };
  const home = '/Personal-Blog/';
  const essays = '/Personal-Blog/essays.html';
  const article = '/Personal-Blog/essays/01-first-essay.html';
  assert.equal(direction(home, essays), 'forward');
  assert.equal(direction(essays, article), 'forward');
  assert.equal(direction(article, essays), 'back');
  assert.equal(direction(essays, home), 'back');
  assert.equal(direction(article, home), 'back');
  assert.equal(direction(article, '/Personal-Blog/index.html'), 'back');
  assert.equal(direction('/Personal-Blog/index.html', essays), 'forward');
  assert.equal(direction(essays, article, 'back'), 'forward');
  assert.equal(direction(essays, '/Personal-Blog/notes.html'), 'forward');
  assert.equal(direction(essays, '/Personal-Blog/notes.html', 'back'), 'back');
  assert.equal(direction(essays, essays + '#details', 'back'), 'back');
});
