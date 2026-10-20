import assert from 'node:assert/strict';
import test from 'node:test';
import { renderMermaidSvg, svgNaturalWidth } from '../site/.vitepress/theme/mermaid-render.mjs';

test('mermaid initializes and renders serially across themes', async () => {
  const events = [];
  const mermaid = {
    initialize(config) { events.push('init:' + config.theme); },
    async render(id) {
      events.push('start:' + id);
      await new Promise(resolve => setImmediate(resolve));
      events.push('finish:' + id);
      return { svg: '<svg viewBox="0 0 300 100"></svg>' };
    }
  };
  await Promise.all([
    renderMermaidSvg(mermaid, 'one', 'flowchart TD', false),
    renderMermaidSvg(mermaid, 'two', 'flowchart TD', true)
  ]);
  assert.deepEqual(events, [
    'init:neutral', 'start:one', 'finish:one',
    'init:dark', 'start:two', 'finish:two'
  ]);
});

test('rendering queue recovers when an earlier graph fails', async () => {
  const events = [];
  const mermaid = {
    initialize(config) { events.push(config.theme); },
    async render(id) {
      if (id === 'bad') throw new Error('invalid graph');
      return { svg: '<svg viewBox="0 0 300 100"></svg>' };
    }
  };
  await assert.rejects(renderMermaidSvg(mermaid, 'bad', 'bad graph', false), /invalid graph/);
  const result = await renderMermaidSvg(mermaid, 'good', 'flowchart LR', true);
  assert.match(result.svg, /<svg/);
  assert.deepEqual(events, ['neutral', 'dark']);
});

test('inline SVG preserves its viewBox width for horizontal scrolling', () => {
  assert.equal(svgNaturalWidth('<svg viewBox="0 0 1200 320"></svg>'), 1200);
  assert.equal(svgNaturalWidth('<svg viewBox="-10, -15, 710.2, 400"></svg>'), 711);
  assert.equal(svgNaturalWidth('<svg viewBox="0 0 4000 320"></svg>'), 2400);
  assert.equal(svgNaturalWidth('<svg></svg>'), 600);
  assert.equal(svgNaturalWidth('<svg viewBox="0 0 -3 300"></svg>'), 600);
});
