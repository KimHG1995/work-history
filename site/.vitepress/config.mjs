import { defineConfig } from 'vitepress';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const projects = path.resolve(import.meta.dirname, '../../projects');
const title = file => readFileSync(file, 'utf8').match(/^# (.+)$/m)?.[1] ?? path.basename(file, '.md');
const groups = readdirSync(projects, { withFileTypes: true }).filter(entry => entry.isDirectory());
const sidebar = groups.map(group => ({
  text: title(path.join(projects, group.name, 'README.md')),
  collapsed: false,
  items: [
    { text: '작업 개요', link: `/projects/${group.name}/` },
    ...readdirSync(path.join(projects, group.name)).filter(name => name.endsWith('.md') && name !== 'README.md')
      .map(name => ({ text: title(path.join(projects, group.name, name)), link: `/projects/${group.name}/${name.replace(/\.md$/, '')}` }))
  ]
}));

export default defineConfig({
  lang: 'ko-KR',
  title: '개발과 작업 기록',
  description: '문제를 발견하고 설계, 개발, 운영으로 이어간 기록',
  base: '/work-history/',
  srcDir: './content',
  cleanUrls: true,
  lastUpdated: false,
  themeConfig: {
    siteTitle: '개발과 작업 기록',
    nav: [{ text: '근무 기록', link: '/' }, { text: '전체 작업', link: '/projects/' }, { text: '기간별 기록', link: '/timeline' }],
    sidebar: [{ text: '기록 살펴보기', items: [{ text: '근무 기록', link: '/' }, { text: '전체 작업 목록', link: '/projects/' }, { text: '기간별 기록', link: '/timeline' }] }, ...sidebar],
    outline: { level: [2, 3], label: '이 페이지에서' },
    search: { provider: 'local', options: { locales: { root: { translations: { button: { buttonText: '검색', buttonAriaLabel: '문서 검색' }, modal: { noResultsText: '검색 결과가 없습니다.', resetButtonTitle: '검색어 지우기', footer: { selectText: '선택', navigateText: '이동', closeText: '닫기' } } } } } } },
    docFooter: { prev: '이전 작업', next: '다음 작업' },
    sidebarMenuLabel: '작업 목록',
    returnToTopLabel: '맨 위로',
    darkModeSwitchLabel: '화면 테마',
    lightModeSwitchTitle: '밝은 화면',
    darkModeSwitchTitle: '어두운 화면',
    footer: { message: '문제에서 시작해 운영까지 이어간 개발 기록' }
  },
  markdown: {
    config(md) {
      const original = md.renderer.rules.fence;
      md.renderer.rules.fence = (tokens, index, options, env, self) => {
        if (tokens[index].info.trim() === 'mermaid') {
          return `<MermaidDiagram encoded="${encodeURIComponent(tokens[index].content)}" />`;
        }
        return original(tokens, index, options, env, self);
      };
    }
  }
});
