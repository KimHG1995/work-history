import assert from 'node:assert/strict';
import test from 'node:test';
import { createMermaidConfig } from '../site/.vitepress/theme/mermaid-config.mjs';

test('flowchart labels use SVG text to avoid HTML foreignObject clipping', () => {
  for (const dark of [false, true]) {
    const config = createMermaidConfig(dark);
    assert.equal(config.flowchart.htmlLabels, false);
    assert.equal(config.securityLevel, 'strict');
    assert.match(config.fontFamily, /Pretendard/);
    assert.equal(config.theme, dark ? 'dark' : 'neutral');
  }
});
