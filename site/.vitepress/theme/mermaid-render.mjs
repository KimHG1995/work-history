import { createMermaidConfig } from './mermaid-config.mjs';

// Mermaid's own render queue does not include initialize(). Keep configuration
// and rendering in one serial operation across all diagram components.
let previousRender = Promise.resolve();

export function renderMermaidSvg(mermaid, id, source, isDark) {
  const task = previousRender.then(async () => {
    mermaid.initialize(createMermaidConfig(isDark));
    return mermaid.render(id, source);
  });
  previousRender = task.then(() => undefined, () => undefined);
  return task;
}

export function svgNaturalWidth(svg) {
  const values = svg.match(/\bviewBox=["']([^"']+)["']/i)?.[1]?.trim().split(/[\s,]+/);
  const width = Number(values?.[2]);
  // Scroll wide graphs rather than downscaling all labels to a mobile width.
  return Number.isFinite(width) && width > 0 ? Math.min(Math.ceil(width), 2400) : 600;
}
