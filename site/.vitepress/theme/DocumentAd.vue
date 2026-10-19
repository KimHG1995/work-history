<script setup>
import { computed, nextTick, onMounted, onUnmounted } from 'vue';
import { useData } from 'vitepress';
import { subscribeAdConsent } from './ad-consent.mjs';

const { frontmatter } = useData();
const publisher = __WORK_HISTORY_AD_PUBLISHER__;
const slotId = __WORK_HISTORY_AD_SLOT__;
const show = computed(() => __WORK_HISTORY_ADS_ENABLED__ && frontmatter.value.workHistoryAd === true);
let unsubscribe = () => {};
let requested = false;
let scriptPromise;

function loadApprovedAd() {
  if (requested || !show.value || typeof window === 'undefined' || location.origin !== __WORK_HISTORY_AD_ORIGIN__) return;
  requested = true;
  scriptPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(publisher);
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
  scriptPromise.then(() => nextTick(() => {
    if (show.value && location.origin === __WORK_HISTORY_AD_ORIGIN__) {
      try { (window.adsbygoogle = window.adsbygoogle || []).push({}); }
      catch { /* Ad blockers must not prevent reading. */ }
    }
  })).catch(() => { /* Fail closed without retrying the network. */ });
}
onMounted(() => {
  if (show.value && location.origin === __WORK_HISTORY_AD_ORIGIN__) unsubscribe = subscribeAdConsent(loadApprovedAd);
});
onUnmounted(() => unsubscribe());
</script>

<template>
  <section v-if="show" class="work-history-document-ad" aria-label="광고">
    <span class="work-history-document-ad-label">광고</span>
    <ins class="adsbygoogle" style="display:block" :data-ad-client="publisher" :data-ad-slot="slotId" data-ad-format="auto" data-full-width-responsive="true"></ins>
  </section>
</template>

<style scoped>
.work-history-document-ad { margin: 2rem 0 1rem; padding-top: 1.5rem; min-height: 100px; border-top: 1px solid var(--vp-c-divider); }
.work-history-document-ad-label { display: block; color: var(--vp-c-text-3); font-size: 0.75rem; margin-bottom: 0.5rem; }
</style>
