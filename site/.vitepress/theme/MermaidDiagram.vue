<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useData } from 'vitepress';
const props = defineProps({ encoded: { type: String, required: true } });
const { isDark } = useData();
const source = computed(() => decodeURIComponent(props.encoded));
const svg = ref('');
const failed = ref(false);
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
watch([source, isDark], render);
</script>

<template>
  <figure class="diagram" aria-label="업무 처리 순서도">
    <div v-if="svg && !failed" class="diagram-canvas" v-html="svg" />
    <pre v-else>{{ source }}</pre>
    <figcaption v-if="failed">순서도를 표시하지 못해 원문을 보여줍니다.</figcaption>
  </figure>
</template>
