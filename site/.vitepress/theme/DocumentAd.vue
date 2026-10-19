<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue';
import { useData } from 'vitepress';
import { subscribeGoogleAdConsent } from './ad-consent.mjs';
import { createAdRuntime } from './ad-runtime.mjs';
import { loadGoogleCmp, loadAdSdk } from './ad-scripts.mjs';

const { frontmatter } = useData();
const publisher = __WORK_HISTORY_AD_PUBLISHER__;
const slotId = __WORK_HISTORY_AD_SLOT__;
const show = computed(() => __WORK_HISTORY_ADS_ENABLED__ && frontmatter.value.workHistoryAd === true);
const consentAllowed = ref(false);
const europeanConsent = ref(false);
let unsubscribe = () => {};
let initializedAd = false;
let reviewRequiresReload = false;
const scriptOptions = () => ({ window, document, origin: __WORK_HISTORY_AD_ORIGIN__, publisher });

const ads = createAdRuntime({
  isEligible: () => show.value && typeof window !== 'undefined' &&
    window.location.origin === __WORK_HISTORY_AD_ORIGIN__,
  loadSdk: () => loadAdSdk(scriptOptions()),
  waitForRender: nextTick,
  initializeAd: () => {
    // The runtime rechecks current consent immediately before this synchronous call.
    window.adsbygoogle.requestNonPersonalizedAds = europeanConsent.value ? 0 : 1;
    window.adsbygoogle.pauseAdRequests = 0;
    initializedAd = true;
    window.adsbygoogle.push({});
  }
});

function onConsentChange(allowed, data) {
  // A removed, initialized slot must not be pushed again in this document.
  // An explicit renewed choice starts a new document with the stored CMP state.
  if (reviewRequiresReload && allowed === true && data?.eventStatus === 'useractioncomplete') {
    reviewRequiresReload = false;
    const target = new URL(location.href);
    target.searchParams.delete('fc');
    target.searchParams.delete('fctype');
    if (target.href === location.href) location.reload();
    else location.replace(target.href);
    return;
  }
  // Keep the current state, not the state at SDK request time.
  consentAllowed.value = allowed === true;
  europeanConsent.value = data?.gdprApplies === true;
  if (!consentAllowed.value && window.adsbygoogle) window.adsbygoogle.pauseAdRequests = 1;
  ads.setConsent(consentAllowed.value);
}

function reviewConsent() {
  reviewRequiresReload = initializedAd;
  onConsentChange(false, { gdprApplies: true });
  window.googlefc?.showRevocationMessage?.();
}

onMounted(() => {
  if (show.value && location.origin === __WORK_HISTORY_AD_ORIGIN__) {
    unsubscribe = subscribeGoogleAdConsent(onConsentChange, window);
    loadGoogleCmp(scriptOptions()).catch(() => { onConsentChange(false); unsubscribe(); });
  }
});
onUnmounted(() => {
  ads.dispose();
  if (typeof window !== 'undefined' && window.adsbygoogle) window.adsbygoogle.pauseAdRequests = 1;
  unsubscribe();
  consentAllowed.value = false;
});
</script>

<template>
  <section v-if="show && consentAllowed" class="work-history-document-ad" aria-label="광고">
    <span class="work-history-document-ad-label">광고</span>
    <ins class="adsbygoogle" style="display:block" :data-ad-client="publisher" :data-ad-slot="slotId" data-ad-format="auto" data-full-width-responsive="true"></ins>
  </section>
  <button v-if="show && europeanConsent" class="work-history-consent-settings" type="button" @click="reviewConsent">광고 개인정보 설정</button>
</template>

<style scoped>
.work-history-document-ad { margin: 2rem 0 1rem; padding-top: 1.5rem; min-height: 100px; border-top: 1px solid var(--vp-c-divider); }
.work-history-document-ad-label { display: block; color: var(--vp-c-text-3); font-size: 0.75rem; margin-bottom: 0.5rem; }
.work-history-consent-settings { color: var(--vp-c-text-2); text-decoration: underline; font-size: 0.8rem; }
</style>
