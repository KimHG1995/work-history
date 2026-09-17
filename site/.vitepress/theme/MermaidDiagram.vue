<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue';
import { useData } from 'vitepress';
const props = defineProps({ encoded: { type: String, required: true } });
const { isDark } = useData();
const source = computed(() => decodeURIComponent(props.encoded));
const svg = ref('');
const failed = ref(false);
const viewer = ref(null);
const viewport = ref(null);
const expanded = ref(false);
const zoom = ref(1);
const fitWidth = ref(600);
function fit() {
  const bounds = viewport.value?.querySelector('svg')?.viewBox.baseVal;
  if (!bounds?.width || !bounds?.height) return;
  const area = viewport.value;
  fitWidth.value = Math.min(area.clientWidth - 32, (area.clientHeight - 32) * bounds.width / bounds.height);
  zoom.value = 1;
}
async function openViewer() {
  expanded.value = true;
  await nextTick();
  viewer.value.showModal();
  fit();
}
function closeViewer() { viewer.value?.close(); expanded.value = false; }
function changeZoom(delta) { zoom.value = Math.min(4, Math.max(0.5, zoom.value + delta)); }
let mounted = false;
let revision = 0;
async function render() {
  if (!mounted) return;
  const current = ++revision;
  failed.value = false;
  try {
    const { default: mermaid } = await import('mermaid');
    mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: isDark.value ? 'dark' : 'neutral', fontFamily: 'sans-serif' });
    const result = await mermaid.render(`diagram-${crypto.randomUUID()}`, source.value);
    if (current === revision) svg.value = result.svg;
  } catch {
    if (current === revision) failed.value = true;
  }
}
onMounted(() => { mounted = true; render(); });
watch([source, isDark], () => { closeViewer(); render(); });
onBeforeUnmount(() => { mounted = false; revision++; closeViewer(); });
</script>

<template>
  <figure class="diagram" aria-label="업무 처리 순서도">
    <div v-if="svg && !failed" class="diagram-toolbar">
      <button class="diagram-expand" type="button" aria-label="크게 보기" @click="openViewer">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5M10.5 7.5v6M7.5 10.5h6" /></svg>
        <span class="diagram-tooltip" aria-hidden="true">크게 보기</span>
      </button>
    </div>
    <div v-if="svg && !failed && !expanded" class="diagram-canvas" v-html="svg" />
    <pre v-if="!svg || failed">{{ source }}</pre>
    <figcaption v-if="failed">순서도를 표시하지 못해 원문을 보여줍니다.</figcaption>
    <dialog ref="viewer" class="diagram-viewer" aria-label="순서도 크게 보기" @close="expanded = false" @click="event => { if (event.target === viewer) closeViewer(); }">
      <div class="viewer-toolbar">
        <strong>순서도</strong>
        <button type="button" aria-label="축소" :disabled="zoom <= 0.5" @click="changeZoom(-0.25)">−</button>
        <output aria-live="polite">{{ Math.round(zoom * 100) }}%</output>
        <button type="button" aria-label="확대" :disabled="zoom >= 4" @click="changeZoom(0.25)">+</button>
        <button type="button" @click="fit">화면 맞춤</button>
        <button type="button" autofocus @click="closeViewer">닫기</button>
      </div>
      <div ref="viewport" class="viewer-viewport" tabindex="0" aria-label="확대한 순서도, 스크롤로 이동">
        <div v-if="expanded" class="viewer-canvas" :style="{ width: `${fitWidth * zoom}px` }" v-html="svg" />
      </div>
    </dialog>
  </figure>
</template>

<style scoped>
.diagram-toolbar { display: flex; justify-content: flex-end; margin-bottom: 12px; }
.diagram-expand { position: relative; display: grid; place-items: center; width: 40px; height: 40px; padding: 0; }
.diagram-tooltip { position: absolute; right: 0; top: calc(100% + 6px); z-index: 1; padding: 4px 8px; border-radius: 6px; background: var(--vp-c-text-1); color: var(--vp-c-bg); font-size: 12px; opacity: 0; visibility: hidden; pointer-events: none; }
.diagram-expand:hover .diagram-tooltip, .diagram-expand:focus-visible .diagram-tooltip { opacity: 1; visibility: visible; }
button { border: 1px solid var(--vp-c-divider); border-radius: 6px; padding: 5px 10px; background: var(--vp-c-bg); color: var(--vp-c-text-1); cursor: pointer; font-size: 14px; white-space: nowrap; }
button:hover { border-color: var(--vp-c-brand-1); }
button:focus-visible { outline: 2px solid var(--vp-c-brand-1); outline-offset: 2px; }
button:disabled { opacity: 0.4; cursor: default; }
.diagram-viewer { position: fixed; inset: 0; margin: auto; width: 96vw; max-width: 1600px; height: 90vh; height: 90dvh; max-height: 96dvh; padding: 16px; border: 1px solid var(--vp-c-divider); border-radius: 12px; background: var(--vp-c-bg); color: var(--vp-c-text-1); }
.diagram-viewer[open] { display: flex; flex-direction: column; gap: 12px; }
.diagram-viewer::backdrop { background: rgb(0 0 0 / 65%); }
.viewer-toolbar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.viewer-toolbar strong { margin-right: auto; }
.viewer-toolbar output { min-width: 42px; text-align: center; font-size: 14px; }
.viewer-viewport { overflow: auto; flex: 1; min-height: 0; padding: 16px; background: var(--vp-c-bg-soft); border-radius: 8px; }
.viewer-canvas { margin: 0 auto; }
.viewer-canvas :deep(svg) { width: 100%; max-width: none !important; height: auto; display: block; }
@media (max-width: 640px) { .diagram-viewer { padding: 10px; } .viewer-toolbar { gap: 6px; } .viewer-toolbar strong { width: 100%; } }
</style>
