import type { Session } from '../types/index.js';
import { isSession } from './session-schema.js';

interface StoredReference {
  bytes: ArrayBuffer;
  mimeType: string;
  name: string;
  width: number;
  height: number;
}
interface StoredSession extends Omit<Session, 'reference'> {
  storageFormat: 'array-buffer-v1';
  reference: StoredReference | null;
}
const imageBytes = new WeakMap<Blob, Promise<ArrayBuffer>>();

// WebKit private/ephemeral sessions cannot store Blob values in IndexedDB.
// Store binary bytes instead; never inflate images into base64 strings.
export async function encodeSession(session: Session): Promise<StoredSession> {
  const image = session.reference;
  if (!image) return { ...session, storageFormat: 'array-buffer-v1', reference: null };
  let bytes = imageBytes.get(image.blob);
  if (!bytes) { bytes = image.blob.arrayBuffer(); imageBytes.set(image.blob, bytes); }
  return { ...session, storageFormat: 'array-buffer-v1', reference: {
    bytes: await bytes, mimeType: image.blob.type,
    name: image.name, width: image.width, height: image.height,
  } };
}
export function decodeSession(value: unknown): Session {
  if (isSession(value)) return value; // Also accept earlier Blob-based records.
  if (typeof value === 'object' && value !== null && 'storageFormat' in value && value.storageFormat === 'array-buffer-v1') {
    const record = value as Record<string, unknown>;
    const image = record.reference;
    if (typeof image === 'object' && image !== null && 'bytes' in image && image.bytes instanceof ArrayBuffer &&
      'mimeType' in image && typeof image.mimeType === 'string' && image.mimeType.startsWith('image/')) {
      const session = { ...record, reference: { ...image, blob: new Blob([image.bytes], { type: image.mimeType }) } };
      if (isSession(session)) return session;
    }
  }
  throw new Error('保存データが破損しているか、未対応のバージョンになっている');
}
