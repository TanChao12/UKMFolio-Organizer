/* IndexedDB: records are never deleted when hidden. The del flag is user-owned. */
const FolioDB = (() => {
  const NAME = 'ukmfolio-organizer-v1', STORE = 'assignments';
  let dbPromise;
  function open() {
    if (!dbPromise) dbPromise = new Promise((resolve,reject) => {
      const request=indexedDB.open(NAME,1);
      request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:'id'});};
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });
    return dbPromise;
  }
  async function all(){const db=await open();return new Promise((resolve,reject)=>{const r=db.transaction(STORE,'readonly').objectStore(STORE).getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
  async function save(record){const db=await open();return new Promise((resolve,reject)=>{const r=db.transaction(STORE,'readwrite').objectStore(STORE).put(record);r.onsuccess=()=>resolve();r.onerror=()=>reject(r.error);});}
  async function patch(id,fields){const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite'),s=tx.objectStore(STORE),q=s.get(id);q.onsuccess=()=>{if(!q.result){reject(Error('Assignment not found'));return;}s.put({...q.result,...fields,modifiedAt:new Date().toISOString()});};tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});}
  async function merge(incoming) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      const change = { created: 0, updated: 0, skipped: 0 };
      const requests = new Map();
      for (const source of incoming) {
        if (source?.id && source?.title) requests.set(source.id, source);
      }
      for (const source of requests.values()) {
        const request = store.get(source.id);
        request.onsuccess = () => {
          const prev = request.result;
          if (!prev) {
            store.put({ ...source, del: 0, completed: false, notes: '', createdAt: new Date().toISOString() });
            change.created++;
            return;
          }
          const merged = { ...prev, ...source, del: prev.del, completed: prev.completed,
            notes: prev.notes, createdAt: prev.createdAt, modifiedAt: prev.modifiedAt };
          if (JSON.stringify(merged) === JSON.stringify(prev)) {
            change.skipped++;
            return;
          }
          store.put(merged);
          change.updated++;
        };
      }
      tx.oncomplete = () => resolve(change);
      tx.onabort = () => reject(tx.error);
    });
  }
  return {all,save,patch,merge};
})();
