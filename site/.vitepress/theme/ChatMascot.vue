<template>
  <span class="mascot" aria-hidden="true">
    <svg viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="48" cy="48" r="45" fill="#FFFFFF" stroke="#447DFA" stroke-width="1.6" />
      <g class="mascot-body" stroke="#101E31" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M46.5 34V29.5A4.9 4.9 0 1 1 49.5 29.5V34" fill="#4DA5FA" />
        <path d="M24 45.5C15.5 45.5 15.5 60.5 24 60.5H27V45.5H24Z" fill="#4DA5FA" />
        <path d="M72 45.5C80.5 45.5 80.5 60.5 72 60.5H69V45.5H72Z" fill="#4DA5FA" />
        <path d="M48 34C34 34 30 34.5 25.5 40C22.5 43.7 22.8 49 22.8 53.5C22.8 61 23.5 64.5 28 68C32 71 37 70.5 48 70.5C59 70.5 64 71 68 68C72.5 64.5 73.2 61 73.2 53.5C73.2 49 73.5 43.7 70.5 40C66 34.5 62 34 48 34Z" fill="#FFFFFF" />
        <rect x="28.5" y="42" width="39" height="22" rx="10.5" fill="#101E31" stroke="none" />
        <g class="mascot-eyes" fill="#5DB8F8" stroke="none">
          <circle cx="38" cy="52.5" r="3.3" />
          <circle cx="58" cy="52.5" r="3.3" />
        </g>
        <path d="M45 56.2Q48 60.2 51 56.2" stroke="#5DB8F8" stroke-width="1.8" />
      </g>
    </svg>
  </span>
</template>

<style scoped>
.mascot { display: block; width: 88px; height: 88px; margin-bottom: 7px; filter: drop-shadow(0 4px 10px #182f5518); }
svg { display: block; width: 100%; height: 100%; }
.mascot-body { transform-origin: 48px 53px; animation: mascot-float 4s ease-in-out infinite; }
.mascot-eyes { transform-origin: 48px 52.5px; animation: mascot-blink 5.5s ease-in-out infinite; }
:global(.chat-open:hover .mascot-body), :global(.chat-open:focus-visible .mascot-body) { animation: mascot-greet .9s ease-in-out 1; }
@keyframes mascot-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-1.5px); } }
@keyframes mascot-blink { 0%, 89%, 95%, 100% { transform: scaleY(1); } 92% { transform: scaleY(.12); } }
@keyframes mascot-greet { 0%, 100% { transform: rotate(0); } 35% { transform: rotate(-5deg); } 70% { transform: rotate(3deg); } }
@media (max-width: 640px) { .mascot { width: 72px; height: 72px; margin-bottom: 5px; } }
@media (prefers-reduced-motion: reduce) { .mascot-body, .mascot-eyes { animation: none !important; } }
</style>
