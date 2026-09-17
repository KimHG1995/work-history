import { h } from 'vue';
import DocsChat from './DocsChat.vue';
import DefaultTheme from 'vitepress/theme';
import MermaidDiagram from './MermaidDiagram.vue';
import './style.css';

export default {
  extends: DefaultTheme,
  Layout: () => h(DefaultTheme.Layout, null, { 'layout-bottom': () => h(DocsChat) }),
  enhanceApp({ app }) {
    app.component('MermaidDiagram', MermaidDiagram);
  }
};
