// Fail closed: this site's stricter policy requires an explicit TCF consent
// before even loading Google Ads. CMP setup is independent of the ad loader.
export function permitsAdConsent(tcData, success) {
  if (!success || !tcData || tcData.gdprApplies !== true ||
      !['tcloaded', 'useractioncomplete'].includes(tcData.eventStatus)) return false;
  const purposes = tcData.purpose?.consents;
  const vendors = tcData.vendor?.consents;
  // Purpose 1 storage and 4 personalized advertising, Google vendor 755.
  return purposes?.[1] === true && purposes?.[4] === true && vendors?.[755] === true;
}

export function subscribeAdConsent(allow, api = globalThis.__tcfapi) {
  if (typeof api !== 'function') return () => {};
  let active = true;
  let listenerId;
  try {
    api('addEventListener', 2, (data, ok) => {
      if (!active) return;
      if (data?.listenerId != null) listenerId = data.listenerId;
      if (permitsAdConsent(data, ok)) allow();
    });
  } catch { return () => {}; }
  return () => {
    active = false;
    if (listenerId !== undefined) {
      try { api('removeEventListener', 2, () => {}, listenerId); }
      catch { /* Never break the document. */ }
    }
  };
}
