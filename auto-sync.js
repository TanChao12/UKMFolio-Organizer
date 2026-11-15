(() => {
  if (globalThis.__folioSync) return;
  let task;
  async function sync(manual) {
    if (task) return task;
    task = (async () => {
      const start = await chrome.runtime.sendMessage({ type: 'folio:start', manual });
      if (start?.state !== 'start') return start;
      try {
        const result = await globalThis.__folioExtractor.run();
        return await chrome.runtime.sendMessage({ type: 'folio:finish', id: start.id, result: {
          records: result.records, errors: result.errors
        } });
      } catch {
        await chrome.runtime.sendMessage({ type: 'folio:cancel', id: start.id });
        return { state: 'error' };
      }
    })();
    try { return await task; } finally { task = undefined; }
  }
  globalThis.__folioSync = sync;
})();
