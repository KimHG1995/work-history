const documents = new WeakMap();

function loadScript({ window: win, document: doc, origin, publisher }, kind) {
  if (win.location.origin !== origin) return Promise.reject(new Error('Unapproved advertising origin'));
  let scripts = documents.get(doc);
  if (!scripts) { scripts = new Map(); documents.set(doc, scripts); }
  if (scripts.has(kind)) return scripts.get(kind);
  const pending = new Promise((resolve, reject) => {
    const script = doc.createElement('script');
    script.async = true;
    if (kind === 'cmp') {
      // Presence signal from Google's standalone message tag. Without it AdSense
      // can bootstrap a second CMP and replace the current visitor's API state.
      if (!win.frames.googlefcPresent) {
        const frame = doc.createElement('iframe');
        frame.name = 'googlefcPresent';
        frame.style.display = 'none';
        frame.title = 'Google privacy messaging';
        doc.body.appendChild(frame);
      }
      // Independent Google messaging tag. Unlike AdSense it does not support CORS.
      script.src = 'https://fundingchoicesmessages.google.com/i/' + publisher.slice(3) + '?ers=1';
      // Match Google's AdSense bootstrap: the loader needs the official preview
      // parameters too, including to expose revocation APIs outside Europe.
      const query = new URL(win.location.href || origin).searchParams;
      if (query.get('fc') === 'alwaysshow' && query.get('fctype') === 'gdpr') {
        script.src += '&fc=alwaysshow&fctype=gdpr';
      }
    } else {
      win.adsbygoogle = win.adsbygoogle || [];
      win.adsbygoogle.pauseAdRequests = 1;
      win.adsbygoogle.requestNonPersonalizedAds = 1;
      script.crossOrigin = 'anonymous';
      script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(publisher);
    }
    script.onload = resolve;
    script.onerror = () => reject(new Error('Google script unavailable'));
    doc.head.appendChild(script);
  });
  scripts.set(kind, pending);
  return pending;
}

export const loadGoogleCmp = options => loadScript(options, 'cmp');
export const loadAdSdk = options => loadScript(options, 'sdk');
