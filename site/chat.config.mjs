// Public Worker origin confirmed in GitHub Actions run 35672720750 (2026-09-22).
// This is not a credential. Keep API keys in the existing Worker Secret.
export const DEFAULT_CHAT_API_URL = 'https://work-history-chat.kim-h-g199510.workers.dev';

/** Resolve once from the same input for Vite's client definition and HTML CSP. */
export function resolveChatApiUrl(value) {
  if (value !== undefined && typeof value !== 'string') throw new Error('Invalid chat origin');
  const origin = value?.trim() || DEFAULT_CHAT_API_URL;
  // An empty Actions variable means "use the existing Worker", not "disable AI".
  if (origin === 'off') return '';
  if (!/^https:\/\/work-history-chat\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.workers\.dev$/.test(origin)) {
    throw new Error('Invalid chat origin: expected a Worker HTTPS origin or off');
  }
  return origin;
}
