// SVG text avoids foreignObject label clipping when Mermaid wraps Korean text.
export function createMermaidConfig(isDark) {
  return {
    startOnLoad: false,
    securityLevel: 'strict',
    theme: isDark ? 'dark' : 'neutral',
    fontFamily: "'Pretendard', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif",
    flowchart: { htmlLabels: false }
  };
}
