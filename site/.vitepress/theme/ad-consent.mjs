// Fail closed until Google has determined applicability or provided TCF consent.
// Report every CMP state transition, including withdrawal, invalid callbacks and
// errors. A positive callback once does not authorize later ad initialization.
export function permitsAdConsent(tcData, success, consentDataReady = false) {
  if (!success || !tcData || tcData.cmpStatus !== 'loaded') return false;
  // Google initially reports false even when the debug EU message will follow.
  // Its final non-European response has no eventStatus or consent string.
  if (tcData.gdprApplies === false) return consentDataReady === true &&
    (tcData.eventStatus === undefined || ['tcloaded', 'useractioncomplete'].includes(tcData.eventStatus));
  if (tcData.gdprApplies !== true ||
      !['tcloaded', 'useractioncomplete'].includes(tcData.eventStatus) ||
      typeof tcData.tcString !== 'string' || !tcData.tcString || tcData.tcString === 'tcunavailable') return false;
  const purposes = tcData.purpose?.consents;
  const vendors = tcData.vendor?.consents;
  // Purpose 1 storage, purposes 3/4 personalized ads, Google vendor 755.
  return purposes?.[1] === true && purposes?.[3] === true &&
    purposes?.[4] === true && vendors?.[755] === true;
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
      onChange(permitsAdConsent(data, ok), data, ok);
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

// API readiness is asynchronous and distinct from the visitor's final choice.
export function subscribeGoogleAdConsent(onChange, win = globalThis) {
  let active = true;
  let attached = false;
  let dataReady = false;
  let latest;
  let success = false;
  let unsubscribe = () => {};
  const report = () => {
    if (active) onChange(permitsAdConsent(latest, success, dataReady), latest);
  };
  function attach() {
    if (!active || attached || typeof win.__tcfapi !== 'function') return;
    attached = true;
    unsubscribe = subscribeAdConsent((allowed, data, ok) => {
      latest = data;
      success = ok;
      report();
    }, win.__tcfapi);
  }
  onChange(false);
  win.googlefc = win.googlefc || {};
  win.googlefc.callbackQueue = win.googlefc.callbackQueue || [];
  // Google accepts one readiness key per queue entry.
  win.googlefc.callbackQueue.push({ CONSENT_API_READY: attach });
  win.googlefc.callbackQueue.push({
    CONSENT_DATA_READY: () => { if (active) { dataReady = true; attach(); report(); } }
  });
  attach();
  return () => { active = false; unsubscribe(); };
}
