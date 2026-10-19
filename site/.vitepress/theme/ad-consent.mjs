// Fail closed: require an explicit TCF consent before requesting Google Ads.
// Report every CMP state transition, including withdrawal, invalid callbacks and
// errors. A positive callback once does not authorize later ad initialization.
export function permitsAdConsent(tcData, success) {
  if (!success || !tcData || tcData.gdprApplies !== true ||
      !['tcloaded', 'useractioncomplete'].includes(tcData.eventStatus)) return false;
  const purposes = tcData.purpose?.consents;
  const vendors = tcData.vendor?.consents;
  // Purpose 1 storage, purpose 4 personalized ads, Google vendor 755.
  return purposes?.[1] === true && purposes?.[4] === true && vendors?.[755] === true;
}

export function subscribeAdConsent(onChange, api = globalThis.__tcfapi) {
  if (typeof api !== 'function') {
    onChange(false);
    return () => {};
  }
  let active = true;
  let listenerId;
  try {
    api('addEventListener', 2, (data, ok) => {
      if (!active) return;
      if (data?.listenerId != null) listenerId = data.listenerId;
      onChange(permitsAdConsent(data, ok));
    });
  } catch {
    onChange(false);
    return () => {};
  }
  return () => {
    active = false;
    if (listenerId !== undefined) {
      try { api('removeEventListener', 2, () => {}, listenerId); }
      catch { /* Do not prevent document cleanup. */ }
    }
  };
}
