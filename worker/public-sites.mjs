// Explicit production allowlist. Tests keep it aligned with site/pages.project.json.
export const publicSites = Object.freeze([
  Object.freeze({ origin: 'https://kimhg1995.github.io', base: '/work-history/' }),
  Object.freeze({ origin: 'https://work-history-4gn.pages.dev', base: '/' })
]);
export function publicSite(origin) {
  return publicSites.find(site => site.origin === origin) || null;
}

/** Recognize only the two existing generated URL layouts. Content is unchanged. */
export function documentsForSite(documents, site) {
  if (!publicSites.includes(site) || !Array.isArray(documents)) throw new Error('Invalid public index target');
  return documents.map(document => {
    const url = document?.url;
    if (typeof url !== 'string' || !url.startsWith('/') || /[\\%?#\s]/u.test(url)) throw new Error('Invalid public document path');
    const route = url.startsWith('/work-history/') ? url.slice('/work-history/'.length) : url.slice(1);
    if (route !== '' && route !== 'timeline' &&
        !(route.startsWith('projects/') && route.split('/').every(part => part && part !== '.' && part !== '..'))) {
      throw new Error('Unexpected generated public document path');
    }
    return { ...document, url: site.base + route };
  });
}

/** Copy headers per response, including replies from the shared Durable Object. */
export function withSiteCors(response, site) {
  const headers = new Headers(response.headers);
  headers.delete('Access-Control-Allow-Origin');
  if (publicSites.includes(site)) headers.set('Access-Control-Allow-Origin', site.origin);
  const vary = headers.get('Vary');
  if (!vary?.split(',').some(value => value.trim().toLowerCase() === 'origin')) {
    headers.set('Vary', vary ? `${vary}, Origin` : 'Origin');
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
