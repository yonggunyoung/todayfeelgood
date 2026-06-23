// 그림공장 — 생성 결과 갤러리 영속화 (IndexedDB). 이미지는 Blob으로 저장(메모리 효율).
// 브라우저 전용. 키/설정은 여기 저장하지 않는다(설정은 store.js의 localStorage).

const DB_NAME = 'geurim';
const STORE = 'images';
let _db = null;

function open() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const os = db.createObjectStore(STORE, { keyPath: 'id' });
        os.createIndex('createdAt', 'createdAt');
      }
    };
    req.onsuccess = () => { _db = req.result; resolve(_db); };
    req.onerror = () => reject(req.error);
  });
}

function tx(mode) {
  return open().then((db) => db.transaction(STORE, mode).objectStore(STORE));
}

function reqAsPromise(r) {
  return new Promise((resolve, reject) => { r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
}

export function b64ToBlob(b64, mime = 'image/png') {
  const clean = b64.includes(',') ? b64.split(',')[1] : b64;
  const bin = atob(clean);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/** 이미지 1장 저장. record: {id, blob, prompt, negative, modelId, provider, aspect, quality, createdAt} */
export async function putImage(record) {
  const os = await tx('readwrite');
  await reqAsPromise(os.put(record));
  return record.id;
}

/** 전체 목록 — 최신순 */
export async function allImages() {
  const os = await tx('readonly');
  const all = await reqAsPromise(os.getAll());
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getImage(id) {
  const os = await tx('readonly');
  return reqAsPromise(os.get(id));
}

export async function deleteImage(id) {
  const os = await tx('readwrite');
  return reqAsPromise(os.delete(id));
}

export async function clearAll() {
  const os = await tx('readwrite');
  return reqAsPromise(os.clear());
}

export async function count() {
  const os = await tx('readonly');
  return reqAsPromise(os.count());
}
