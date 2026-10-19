<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue';
import { useData } from 'vitepress';
import { subscribeAdConsent } from './ad-consent.mjs';
import { createAdRuntime } from './ad-runtime.mjs';

const { frontmatter } = useData();
const publisher = __WORK_HISTORY_AD_PUBLISHER__;
const slotId = __WORK_HISTORY_AD_SLOT__;
const show = computed(() => __WORK_HISTORY_ADS_ENABLED__ && frontmatter.value.workHistoryAd === true);
const consentAllowed = ref(false);
let unsubscribe = () => {};

const ads = createAdRuntime({
  isEligible: () => show.value && typeof window !== 'undefined' &&
    window.location.origin === __WORK_HISTORY_AD_ORIGIN__,
  loadSdk: () => new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' +
      encodeURIComponent(publisher);
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  }),
  waitForRender: nextTick,
  initializeAd: () => { (window.adsbygoogle = window.adsbygoogle || []).push({}); }
});

function onConsentChange(allowed) {
  // Keep the current state, not the state at SDK request time.
  consentAllowed.value = allowed === true;
  ads.setConsent(consentAllowed.value);
}

onMounted(() => {
  if (show.value && location.origin === __WORK_HISTORY_AD_ORIGIN__) {
    unsubscribe = subscribeAdConsent(onConsentChange);
  }
});
onUnmounted(() => {
  ads.dispose();
  unsubscribe();
  consentAllowed.value = false;
});
</script>

<template>
  <section v-if="show && consentAllowed" class="work-history-document-ad" aria-label="광고">
    <span class="work-history-document-ad-label">광고</span>
    <ins class="adsbygoogle" style="display:block" :data-ad-client="publisher" :data-ad-slot="slotId" data-ad-format="auto" data-full-width-responsive="true"></ins>
  </section>
</template>

<style scoped>
.work-history-document-ad { margin: 2rem 0 1rem; padding-top: 1.5rem; min-height: 100px; border-top: 1px solid var(--vp-c-divider); }
.work-history-document-ad-label { display: block; color: var(--vp-c-text-3); font-size: 0.75rem; margin-bottom: 0.5rem; }
</style>
