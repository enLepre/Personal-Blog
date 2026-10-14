import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';

test('homepage scrolling reuses layout measurements and still reveals every link', () => {
  const source = readFileSync('src/components/AnimatedHomepage.astro', 'utf8').split('<script>')[1].split('</script>')[0];
  let measurements = 0, heightWrites = 0, pending;
  const element = () => ({ style: {}, inert: false });
  const title = element(), image = element(), hint = element();
  const rows = Array.from({ length: 4 }, element);
  const stage = { get clientHeight() { measurements++; return 800; } };
  const elements = { '.home-stage': stage, '.home-title': title, '.home-landscape': image, '.scroll-hint': hint, '.home-sections': { offsetHeight: 400 } };
  const root = {
    classList: { add() {}, remove() {} },
    style: { set height(value) { heightWrites++; } },
    getBoundingClientRect() { measurements++; return { top: 84 - window.scrollY }; },
    querySelector: selector => elements[selector],
    querySelectorAll: () => rows,
  };
  const listeners = {};
  const window = { scrollY: 0, addEventListener(name, handler, options) { listeners[name] = { handler, signal: options.signal }; } };
  const events = {};
  const document = { querySelector: () => root, addEventListener(name, handler) { events[name] = handler; } };
  vm.runInNewContext(stripTypeScriptTypes(source), {
    document, window, innerHeight: 800, matchMedia: () => ({ matches: false }), AbortController,
    requestAnimationFrame(callback) { pending = callback; return 1; },
    cancelAnimationFrame() { pending = undefined; },
  });
  assert.equal(measurements, 2);
  assert.equal(heightWrites, 1);
  const scrollTo = value => { window.scrollY = value; listeners.scroll.handler(); pending(); };
  scrollTo(1100);
  scrollTo(2356);
  assert.equal(measurements, 2);
  assert.equal(heightWrites, 1);
  assert.ok(rows.every(row => row.style.opacity === '1' && row.inert === false));
  scrollTo(0);
  assert.ok(rows.every(row => row.style.visibility === 'hidden' && row.inert === true));
  listeners.resize.handler(); pending();
  assert.equal(measurements, 4);
  assert.equal(heightWrites, 2);
  events['astro:before-swap']();
  assert.equal(listeners.scroll.signal.aborted, true);
});
