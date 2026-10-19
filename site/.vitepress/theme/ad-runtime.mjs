// One runtime per mounted document advertisement. Re-check consent when the
// SDK resolves and once more after rendering, immediately before push().
export function createAdRuntime({
  loadSdk,
  initializeAd,
  isEligible,
  waitForRender = () => Promise.resolve()
}) {
  let currentConsent = false;
  let generation = 0;
  let sdkPromise;
  let initialized = false;
  let unavailable = false;
  let disposed = false;

  function stillAllowed(token) {
    return !disposed && currentConsent && generation === token &&
      !initialized && isEligible();
  }

  function initializeWhenReady() {
    if (!stillAllowed(generation) || unavailable) return;
    const token = generation;
    if (!sdkPromise) {
      try {
        sdkPromise = Promise.resolve(loadSdk());
      } catch {
        unavailable = true;
        return;
      }
    }
    sdkPromise.then(async () => {
      // A consent withdrawal invalidates callbacks created before it.
      if (!stillAllowed(token)) return;
      await waitForRender();
      if (!stillAllowed(token)) return;
      // Do not retry if Google partially accepted this push.
      initialized = true;
      try { initializeAd(); }
      catch { /* Third-party errors do not affect document reading. */ }
    }).catch(() => {
      // One failed SDK/render attempt must not trigger an ad request loop.
      unavailable = true;
    });
  }

  function setConsent(next) {
    if (disposed) return;
    const allowed = next === true;
    if (currentConsent === allowed) return;
    currentConsent = allowed;
    generation++;
    if (allowed) initializeWhenReady();
  }

  function dispose() {
    disposed = true;
    currentConsent = false;
    generation++;
  }

  return { setConsent, dispose };
}
