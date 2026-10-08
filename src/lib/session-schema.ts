import { DEFAULT_TRANSFORM } from './geometry.js';
import type { Session, Stroke } from '../types/index.js';

export function newSession(): Session {
  return {
    version: 1, strokes: [], reference: null, transform: { ...DEFAULT_TRANSFORM },
    locked: false, grayscale: false,
    grid: { enabled: true, multiplier: 1, colorKey: 'red', lineWidth: 1 },
    compare: { enabled: false, opacity: 0.35 },
    tool: 'pen', penSize: 4, eraserSize: 20, exportBackground: 'white',
  };
}
function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
function number(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}
function stroke(value: unknown): value is Stroke {
  return object(value) && (value.tool === 'pen' || value.tool === 'eraser') &&
    value.color === '#000000' && number(value.size, 0.1, 100) &&
    Array.isArray(value.points) && value.points.length > 0 && value.points.every(point =>
      object(point) && number(point.x, -1e7, 1e7) && number(point.y, -1e7, 1e7));
}
// Reject incompatible/corrupt saves rather than silently overwriting them.
export function isSession(value: unknown): value is Session {
  if (!object(value) || value.version !== 1 || !Array.isArray(value.strokes) || !value.strokes.every(stroke)) return false;
  const { transform: t, grid: g, compare: c, reference: r } = value;
  return object(t) && number(t.scale, 0.3, 5) && number(t.rotation, -360, 360) &&
    number(t.translateX, -1e7, 1e7) && number(t.translateY, -1e7, 1e7) &&
    object(g) && typeof g.enabled === 'boolean' && (g.multiplier === 1 || g.multiplier === 2) &&
    ['red', 'black', 'blue', 'green'].includes(String(g.colorKey)) && number(g.lineWidth, 0.5, 3) &&
    object(c) && typeof c.enabled === 'boolean' && number(c.opacity, 0, 1) &&
    typeof value.locked === 'boolean' && typeof value.grayscale === 'boolean' &&
    (value.tool === 'pen' || value.tool === 'eraser') && number(value.penSize, 0.1, 100) &&
    number(value.eraserSize, 0.1, 100) && ['white', 'transparent'].includes(String(value.exportBackground)) &&
    (r === null || (object(r) && r.blob instanceof Blob && r.blob.type.startsWith('image/') &&
      typeof r.name === 'string' && number(r.width, 1, 2560) && number(r.height, 1, 2560)));
}
