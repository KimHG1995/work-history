import { h } from 'vue';
import DocsChat from './DocsChat.vue';
import DefaultTheme from 'vitepress/theme';
import MermaidDiagram from './MermaidDiagram.vue';
import DocumentAd from './DocumentAd.vue';
import './style.css';

export default {
  extends: DefaultTheme,
  Layout: () => h(DefaultTheme.Layout, null, { 'layout-bottom': () => h(DocsChat), 'doc-after': () => h(DocumentAd) }),
  enhanceApp({ app }) {
    app.component('MermaidDiagram', MermaidDiagram);
  }
};
