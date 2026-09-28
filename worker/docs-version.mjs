/** The browser and Worker hash the same public index representation. */
export async function hashDocuments(documents) {
  const bytes = new TextEncoder().encode(JSON.stringify(documents));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}
