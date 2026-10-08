import test from 'node:test';
import assert from 'node:assert/strict';
import { newSession, isSession } from '../.test-build/lib/session-schema.js';
import { encodeSession, decodeSession } from '../.test-build/lib/storage-codec.js';

test('binary storage codec round-trips images without storing Blob in IndexedDB', async () => {
  const session = newSession();
  session.reference = { blob: new Blob(['test-image'], { type: 'image/png' }), width: 200, height: 250, name: 'test.png' };
  session.strokes = [{ tool: 'pen', size: 4, color: '#000000', points: [{ x: 1, y: 2 }] }];
  const record = await encodeSession(session);
  assert.ok(record.reference.bytes instanceof ArrayBuffer);
  assert.equal('blob' in record.reference, false);
  const restored = decodeSession(structuredClone(record));
  assert.equal(await restored.reference.blob.text(), 'test-image');
  assert.equal(restored.reference.blob.type, 'image/png');
  assert.deepEqual(restored.strokes, session.strokes);
  assert.ok(isSession(restored));
  assert.ok(isSession(decodeSession(await encodeSession(newSession()))));
});
test('storage decoder refuses corrupt binary data and accepts earlier records', () => {
  assert.ok(isSession(decodeSession(newSession())));
  assert.throws(() => decodeSession({ ...newSession(), storageFormat: 'array-buffer-v1', reference: { bytes: 'bad', mimeType: 'image/png' } }));
});
