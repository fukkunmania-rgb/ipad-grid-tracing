import type { Session } from '../types';
import { encodeSession, decodeSession } from './storage-codec';

let database: Promise<IDBDatabase> | undefined;
function openDatabase(): Promise<IDBDatabase> {
  if (!database) {
    database = new Promise((resolve, reject) => {
      const request = indexedDB.open('grid-tracing', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('sessions');
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('別のタブが保存データを使用中。ほかのタブを閉じて再読み込みしてほしい'));
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => { db.close(); database = undefined; };
        resolve(db);
      };
    });
    database.catch(() => { database = undefined; });
  }
  return database;
}
export async function loadSession(): Promise<Session | null> {
  const db = await openDatabase();
  const value: unknown = await new Promise((resolve, reject) => {
    const tx = db.transaction('sessions', 'readonly');
    const request = tx.objectStore('sessions').get('latest');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  if (value === undefined) return null;
  return decodeSession(value);
}
// Serialize writes so a slow old snapshot cannot finish after a newer one.
let writeQueue: Promise<void> = Promise.resolve();
export function saveSession(session: Session): Promise<void> {
  const next = writeQueue.catch(() => {}).then(async () => {
    const snapshot = await encodeSession(session);
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('sessions', 'readwrite');
      tx.objectStore('sessions').put(snapshot, 'latest');
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error ?? new Error('自動保存が中断された'));
      tx.onerror = () => reject(tx.error);
    });
  });
  writeQueue = next;
  return next;
}
