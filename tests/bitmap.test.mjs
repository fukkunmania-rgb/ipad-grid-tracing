import test from 'node:test';
import assert from 'node:assert/strict';
import { drawStroke } from '../.test-build/lib/drawing.js';

test('bitmap scaling applies once to both coordinates and fixed line width', () => {
  const points = [];
  const ctx = { beginPath() {}, moveTo(x, y) { points.push([x,y]); }, lineTo(x, y) { points.push([x,y]); }, stroke() {} };
  const stroke = { tool: 'pen', size: 4, color: '#000000', points: [{ x: 100, y: 20 }, { x: 105, y: 40 }] };
  drawStroke(ctx, stroke, 1.575);
  assert.equal(ctx.lineWidth, 6.3);
  assert.deepEqual(points, [[157.5,31.5], [165.375,63]]);
});
