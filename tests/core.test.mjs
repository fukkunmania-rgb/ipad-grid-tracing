import test from 'node:test';
import assert from 'node:assert/strict';
import { DrawingHistory, drawStroke } from '../.test-build/lib/drawing.js';
import { angle, center, fitPaper, normalizeRadians, toDocumentPoint, transformGesture, transformPoint } from '../.test-build/lib/geometry.js';
import { newSession, isSession } from '../.test-build/lib/session-schema.js';
import { EXPORT_WIDTH, EXPORT_HEIGHT } from '../.test-build/types/index.js';

const stroke = (x = 1, tool = 'pen') => ({ tool, size: 4, color: '#000000', points: [{ x, y: 20 }, { x: x + 5, y: 40 }] });
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);
const identity = { scale: 1, rotation: 0, translateX: 0, translateY: 0 };

test('every Undo and Redo invocation executes; no boolean trigger', () => {
  const h = new DrawingHistory();
  [1, 2, 3].forEach(x => h.commit(stroke(x)));
  for (const n of [2, 1, 0]) { h.undo(); assert.equal(h.getStrokes().length, n); }
  assert.deepEqual(h.status, { canUndo: false, canRedo: true });
  for (const n of [1, 2, 3]) { h.redo(); assert.equal(h.getStrokes().length, n); }
});
test('Clear is repeatable and undoable', () => {
  const h = new DrawingHistory([stroke()]);
  h.clear(); assert.equal(h.getStrokes().length, 0);
  h.undo(); assert.equal(h.getStrokes().length, 1);
  h.redo(); assert.equal(h.getStrokes().length, 0);
  h.commit(stroke(2)); h.clear(); assert.equal(h.getStrokes().length, 0);
  h.undo(); assert.equal(h.getStrokes()[0].points[0].x, 2);
});
test('drawing after Undo discards only the redo branch', () => {
  const h = new DrawingHistory([stroke(1), stroke(2)]);
  h.undo(); h.commit(stroke(3)); h.redo();
  assert.deepEqual(h.getStrokes().map(s => s.points[0].x), [1, 3]);
  assert.equal(h.status.canRedo, false);
});
test('history boundaries and reset', () => {
  const h = new DrawingHistory();
  h.undo(); h.redo(); h.clear();
  assert.deepEqual(h.status, { canUndo: false, canRedo: false });
  h.commit(stroke()); h.reset();
  assert.deepEqual(h.getStrokes(), []);
  assert.deepEqual(h.status, { canUndo: false, canRedo: false });
});
test('undo retains old drawing without full canvas snapshots', () => {
  const h = new DrawingHistory();
  for (let i = 0; i < 1000; i++) h.commit(stroke(i));
  for (let i = 0; i < 1000; i++) h.undo();
  assert.equal(h.getStrokes().length, 0);
  for (let i = 0; i < 1000; i++) h.redo();
  assert.equal(h.getStrokes().length, 1000);
});
test('document coordinate conversion does not depend on viewport scale', () => {
  assert.deepEqual(toDocumentPoint(170, 230, { left: 10, top: 30, width: 320, height: 400 }), { x: 320, y: 400 });
  assert.deepEqual(toDocumentPoint(340, 460, { left: 20, top: 60, width: 640, height: 800 }), { x: 320, y: 400 });
});
test('paper fits available space and keeps exact 4:5 aspect', () => {
  for (const [width, height] of [[593, 460], [834, 390], [400, 1100], [0, 0]]) {
    const size = fitPaper(width, height);
    assert.ok(size.width <= width && size.height <= height);
    close(size.height * 4, size.width * 5);
  }
});
test('off-center pinch preserves the point under the finger midpoint', () => {
  const anchor = { x: 80, y: 120 }, current = { x: 100, y: 135 };
  const t = transformGesture(identity, anchor, current, 2, Math.PI / 4);
  const point = transformPoint(anchor, t);
  close(point.x, current.x); close(point.y, current.y);
});
test('gesture anchoring also works after translation and rotation', () => {
  const start = { scale: 1.7, rotation: 37, translateX: 24, translateY: -31 };
  const imagePoint = { x: 200, y: 450 };
  const anchor = transformPoint(imagePoint, start), current = { x: 280, y: 250 };
  const next = transformGesture(start, anchor, current, 1.5, -Math.PI / 5);
  const point = transformPoint(imagePoint, next);
  close(point.x, current.x); close(point.y, current.y);
});
test('scale clamping uses the effective ratio for the anchor', () => {
  const anchor = { x: 50, y: 100 };
  for (const ratio of [100, 0.0001]) {
    const next = transformGesture(identity, anchor, anchor, ratio, 0);
    const point = transformPoint(anchor, next);
    close(point.x, anchor.x); close(point.y, anchor.y);
    assert.ok(next.scale >= 0.3 && next.scale <= 5);
  }
});
test('angle wrap remains continuous across minus/plus pi', () => {
  close(normalizeRadians(-358 * Math.PI / 180), 2 * Math.PI / 180);
  const next = transformGesture(identity, { x: 300, y: 400 }, { x: 300, y: 400 }, 1, -358 * Math.PI / 180);
  close(next.rotation, 2);
  close(angle({ x: 0, y: 0 }, { x: 1, y: 0 }), 0);
  assert.deepEqual(center({ x: 0, y: 2 }, { x: 2, y: 4 }), { x: 1, y: 3 });
});
test('brush widths and dots do not depend on supplied pressure', () => {
  const ctx = { beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, fill() {}, arc(x, y, radius) { this.radius = radius; } };
  for (const pressure of [0, 0.49, 0.5, 0.51, 1]) {
    drawStroke(ctx, { ...stroke(), points: [{ x: 2, y: 2, pressure }] });
    assert.equal(ctx.lineWidth, 4);
    assert.equal(ctx.radius, 2);
    drawStroke(ctx, { ...stroke(), points: [{ x: 2, y: 2, pressure }, { x: 10, y: 10, pressure }] });
    assert.equal(ctx.lineWidth, 4);
  }
});
test('eraser rendering uses destination-out', () => {
  const ctx = { beginPath() {}, moveTo() {}, lineTo() {}, stroke() {} };
  drawStroke(ctx, stroke(1, 'eraser'));
  assert.equal(ctx.globalCompositeOperation, 'destination-out');
  drawStroke(ctx, stroke()); assert.equal(ctx.globalCompositeOperation, 'source-over');
});
test('export dimensions are fixed and independent of DPR', () => {
  assert.equal(EXPORT_HEIGHT, 720); assert.equal(EXPORT_WIDTH, 576);
});
test('valid sessions survive structured cloning including image Blobs', () => {
  const session = newSession();
  session.reference = { blob: new Blob(['image'], { type: 'image/png' }), width: 200, height: 250, name: 'example.png' };
  session.strokes = [stroke()];
  assert.ok(isSession(structuredClone(session)));
});
test('invalid sessions are rejected instead of silently overwritten', () => {
  assert.equal(isSession(null), false);
  for (const patch of [{ version: 2 }, { strokes: [{ ...stroke(), size: NaN }] },
    { strokes: [{ ...stroke(), points: [{ x: Infinity, y: 1 }] }] },
    { transform: { ...identity, scale: 0 } }, { reference: { blob: 'not a Blob' } },
    { grid: { ...newSession().grid, multiplier: 5 } }, { penSize: -1 }]) {
    assert.equal(isSession({ ...newSession(), ...patch }), false);
  }
});
