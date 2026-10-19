<script setup>
import { computed, nextTick, onMounted, watch } from 'vue';
import { useData, useRouter } from 'vitepress';

const { frontmatter } = useData();
const router = useRouter();
const publisher = __WORK_HISTORY_AD_PUBLISHER__;
const slotId = __WORK_HISTORY_AD_SLOT__;
const show = computed(() => __WORK_HISTORY_ADS_ENABLED__ && frontmatter.value.workHistoryAd === true);
let requested = false;
function requestAd() {
  if (!show.value || requested || typeof window === 'undefined' || window.location.origin !== __WORK_HISTORY_AD_ORIGIN__) return;
  requested = true;
  nextTick(() => {
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); }
    catch { /* Keep the document readable when Google is blocked. */ }
  });
}
onMounted(requestAd);
watch(show, requestAd);

// Page-specific CSP must be loaded with its original HTML response.
// On a different page perform a full navigation instead of keeping a prior CSP.
if (typeof window !== 'undefined' && __WORK_HISTORY_ADS_ENABLED__ && window.location.origin === __WORK_HISTORY_AD_ORIGIN__) {
  const original = router.onBeforeRouteChange;
  router.onBeforeRouteChange = to => {
    const next = new URL(to, window.location.href);
    if (next.pathname !== window.location.pathname) {
      window.location.assign(next.href);
      return false;
    }
    return original?.(to);
  };
}
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
