importScripts('db.js');

const UKMFOLIO_HOSTS = new Set(['ukmfoliov2.ukm.my', 'ukmfolio.ukm.my', 'ukmfolio.ukm.qa']);
const malaysiaDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: '2-digit', day: '2-digit' });
const LEASE_TIME = 10 * 60_000;
let pending = Promise.resolve();

chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (!['folio:start', 'folio:finish', 'folio:cancel'].includes(message?.type)) return;
  const url = new URL(sender.url || 'about:blank');
  if (sender.frameId !== 0 || !sender.documentId || url.protocol !== 'https:' || !UKMFOLIO_HOSTS.has(url.hostname)) return;

  const run = async () => {
    const { folioSyncLease: lease } = await chrome.storage.session.get('folioSyncLease');
    if (message.type === 'folio:start') {
      if (lease?.expires > Date.now()) return { state: 'busy' };
      const { lastAutoSyncDay } = await chrome.storage.local.get('lastAutoSyncDay');
      const today = malaysiaDay.format(Date.now());
      if (!message.manual && lastAutoSyncDay === today) {
        return { state: 'recent' };
      }
      const id = crypto.randomUUID();
      await chrome.storage.session.set({ folioSyncLease: { id, document: sender.documentId, tabId: sender.tab.id, expires: Date.now() + LEASE_TIME } });
      if (!message.manual) {
        await chrome.storage.local.set({ lastAutoSyncDay: today });
      }
      return { state: 'start', id };
    }
    if (lease?.id !== message.id || lease.document !== sender.documentId) return { state: 'expired' };
    try {
      if (message.type === 'folio:cancel') return { state: 'cancelled' };
      const count = message.result.records.length;
      const change = await FolioDB.merge(message.result.records);
      if (count) {
        await chrome.storage.local.set({ lastSync: new Date().toISOString(), lastSite: url.origin });
      } else {
        await chrome.storage.local.set({ folioSyncRevision: crypto.randomUUID() });
      }
      return { state: 'done', count, added: change.created, partial: message.result.errors.length > 0 };
    } finally {
      await chrome.storage.session.remove('folioSyncLease');
    }
  };
  const operation = pending.then(run);
  pending = operation.catch(() => {});
  operation.then(reply, () => reply({ state: 'error' }));
  return true;
});

chrome.tabs.onUpdated.addListener((tabId, change) => {
  if (change.status !== 'loading') return;
  releaseOnNavigation(tabId);
});
chrome.tabs.onRemoved.addListener(releaseOnNavigation);

function releaseOnNavigation(tabId) {
  const operation = pending.then(async () => {
    const { folioSyncLease: lease } = await chrome.storage.session.get('folioSyncLease');
    if (lease?.tabId === tabId) {
      await chrome.storage.session.remove('folioSyncLease');
    }
  });
  pending = operation.catch(() => {});
}
