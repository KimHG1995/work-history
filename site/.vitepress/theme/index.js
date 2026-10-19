import { h } from 'vue';
import DocsChat from './DocsChat.vue';
import DefaultTheme from 'vitepress/theme';
import MermaidDiagram from './MermaidDiagram.vue';
import DocumentAd from './DocumentAd.vue';
import './style.css';

export default {
  extends: DefaultTheme,
  Layout: () => h(DefaultTheme.Layout, null, { 'layout-bottom': () => h(DocsChat), 'doc-after': () => h(DocumentAd) }),
  enhanceApp({ app, router }) {
    // Runs on ALL pages, including 404 where doc-after is not mounted.
    const previous = router.onBeforeRouteChange;
    router.onBeforeRouteChange = to => {
      if (typeof window !== 'undefined' && __WORK_HISTORY_ADS_ENABLED__ && location.origin === __WORK_HISTORY_AD_ORIGIN__) {
        const destination = new URL(to, location.href);
        if (destination.pathname !== location.pathname) {
          location.assign(destination.href);
          return false;
        }
      }
      return previous?.(to);
    };
    app.component('MermaidDiagram', MermaidDiagram);
  }
};
