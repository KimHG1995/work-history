<script setup>
import { ref, computed, onUnmounted } from 'vue';
import { withBase } from 'vitepress';
import { search } from '../../../worker/search.mjs';
const dialog = ref(null);
const question = ref('');
const answer = ref('');
const sources = ref([]);
const loading = ref(false);
const remaining = ref(0);
const api = import.meta.env.VITE_CHAT_API_URL || '';
let index; let timer; let controller;
const disabled = computed(() => loading.value || remaining.value > 0 || !question.value.trim());
function open() { dialog.value.showModal(); }
function close() { dialog.value.close(); }
function wait(seconds) {
  clearInterval(timer); remaining.value = seconds;
  timer = setInterval(() => { remaining.value = Math.max(0, remaining.value - 1); if (!remaining.value) clearInterval(timer); }, 1000);
}
onUnmounted(() => { clearInterval(timer); controller?.abort(); });
async function ask() {
  if (disabled.value) return;
  loading.value = true; answer.value = ''; sources.value = [];
  try {
    if (!index) {
      const response = await fetch(withBase('/chat-docs.json'));
      if (!response.ok) throw new Error('index');
      index = await response.json();
    }
    sources.value = search(question.value, index);
    if (!sources.value.length) {
      answer.value = '공개 문서에서 관련 내용을 찾지 못했습니다. 프로젝트명이나 기술 이름을 넣어 질문해 주세요.';
      return;
    }
    if (!api) { answer.value = '관련 문서를 찾았습니다. 아래 링크에서 확인해 주세요.'; return; }
    controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 35000);
    try {
      const response = await fetch(`${api}/chat`, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({question: question.value.trim()}), signal: controller.signal});
      const body = await response.json();
      answer.value = typeof body.answer === 'string' ? body.answer : (typeof body.message === 'string' ? body.message : 'AI 답변을 받지 못했습니다. 아래 문서를 확인해 주세요.');
      // Links come from the local document index, never from model output.
      if (Array.isArray(body.sources)) sources.value = body.sources.filter(source => index.some(doc => doc.url === source.url && doc.title === source.title));
      if (Number.isFinite(body.retryAfter) && body.retryAfter > 0) wait(Math.min(86400, Math.ceil(body.retryAfter)));
      else if (response.ok) wait(10);
    } finally { clearTimeout(timeout); }
  } catch { answer.value = '지금은 AI 답변을 제공하기 어렵습니다. 아래 문서를 확인해 주세요.'; }
  finally { loading.value = false; }
}
</script>

<template>
  <button class="chat-open" aria-haspopup="dialog" @click="open">문서에 질문하기</button>
  <dialog ref="dialog" class="docs-chat" aria-labelledby="chat-title" data-clarity-mask="true">
    <header><div><h2 id="chat-title">경력 문서에 질문하기</h2><p>공개된 프로젝트와 경험을 찾아 답합니다.</p></div><button class="chat-close" aria-label="질문 창 닫기" @click="close">닫기</button></header>
    <form @submit.prevent="ask">
      <label for="chat-question">궁금한 내용</label>
      <textarea id="chat-question" v-model="question" maxlength="500" rows="3" placeholder="쿠폰 시스템은 어떻게 개발했나요?" :disabled="loading" />
      <p class="chat-note">질문과 관련 문서 일부가 AI 제공자에게 전송됩니다. 개인정보는 입력하지 마세요.</p>
      <button type="submit" class="chat-submit" :disabled="disabled">{{ loading ? '문서에서 답을 찾고 있습니다…' : remaining ? `${remaining}초 후 다시 질문` : '질문하기' }}</button>
    </form>
    <section class="chat-result" aria-live="polite" :aria-busy="loading">
      <p v-if="answer" class="chat-answer">{{ answer }}</p>
      <template v-if="sources.length"><h3>관련 문서</h3><ol><li v-for="(source, i) in sources" :key="source.url"><a :href="source.url">[{{ i + 1 }}] {{ source.title }}</a></li></ol></template>
    </section>
    <p class="chat-note">AI 답변은 원문과 함께 확인해 주세요. 이용 한도에 도달하면 문서 링크를 제공합니다.</p>
  </dialog>
</template>

<style scoped>
.chat-open { position: fixed; right: 24px; bottom: 24px; z-index: 30; border: 1px solid var(--vp-c-divider); border-radius: 24px; padding: 12px 18px; background: var(--vp-c-brand-1); color: var(--vp-c-white); font-size: 14px; font-weight: 600; box-shadow: 0 4px 18px #0002; }
.docs-chat { margin: auto; width: min(560px, calc(100vw - 32px)); max-height: calc(100dvh - 40px); padding: 24px; border: 1px solid var(--vp-c-divider); border-radius: 16px; background: var(--vp-c-bg); color: var(--vp-c-text-1); overflow-y: auto; box-shadow: 0 16px 60px #0003; }
.docs-chat::backdrop { background: #0007; }
header { display: flex; justify-content: space-between; gap: 16px; margin-bottom: 24px; }
h2 { font-size: 20px; font-weight: 600; }
header p, .chat-note { color: var(--vp-c-text-2); font-size: 12px; line-height: 1.6; margin-top: 8px; }
.chat-close { align-self: flex-start; white-space: nowrap; padding: 4px 8px; border-radius: 6px; border: 1px solid var(--vp-c-divider); font-size: 12px; }
label { display: block; font-size: 14px; font-weight: 600; margin-bottom: 8px; }
textarea { display: block; width: 100%; padding: 12px; resize: vertical; border: 1px solid var(--vp-c-divider); border-radius: 8px; background: var(--vp-c-bg-alt); font: inherit; font-size: 16px; line-height: 1.6; }
textarea:focus-visible, button:focus-visible, a:focus-visible { outline: 2px solid var(--vp-c-brand-1); outline-offset: 3px; }
.chat-submit { margin-top: 16px; padding: 10px 16px; width: 100%; background: var(--vp-c-brand-1); color: var(--vp-c-white); border-radius: 8px; font-size: 14px; }
.chat-submit:disabled { opacity: .55; cursor: not-allowed; }
.chat-result { margin-top: 20px; font-size: 14px; line-height: 1.8; }
.chat-answer { white-space: pre-wrap; overflow-wrap: anywhere; }
h3 { font-weight: 600; margin-top: 16px; }
ol { padding: 0; list-style: none; }
a { color: var(--vp-c-brand-1); text-decoration: underline; }
@media(max-width: 640px) { .chat-open { right: 16px; bottom: 16px; } .docs-chat { padding: 20px; } }
</style>
