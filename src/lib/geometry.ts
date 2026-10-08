import { PAPER_WIDTH, PAPER_HEIGHT } from '../types/index.js';
import type { ImageTransform, Point } from '../types/index.js';

export const DEFAULT_TRANSFORM: ImageTransform = {
  scale: 1, rotation: 0, translateX: 0, translateY: 0,
};
export const MIN_SCALE = 0.3;
export const MAX_SCALE = 5;
const origin = { x: PAPER_WIDTH / 2, y: PAPER_HEIGHT / 2 };

export function toDocumentPoint(clientX: number, clientY: number,
  rect: { left: number; top: number; width: number; height: number }): Point {
  return {
    x: (clientX - rect.left) * PAPER_WIDTH / Math.max(rect.width, 1),
    y: (clientY - rect.top) * PAPER_HEIGHT / Math.max(rect.height, 1),
  };
}
export function fitPaper(width: number, height: number) {
  const scale = Math.max(0, Math.min(width / PAPER_WIDTH, height / PAPER_HEIGHT));
  // Keep the exact aspect ratio; do not round width and height independently.
  return { width: PAPER_WIDTH * scale, height: PAPER_HEIGHT * scale };
}
export function distance(a: Point, b: Point) { return Math.hypot(b.x - a.x, b.y - a.y); }
export function center(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}
export function angle(a: Point, b: Point) { return Math.atan2(b.y - a.y, b.x - a.x); }
export function normalizeRadians(value: number) { return Math.atan2(Math.sin(value), Math.cos(value)); }

// T(currentCenter) * R(delta) * S(ratio) * T(-startCenter) * startMatrix.
// Translations are in document units, with the paper center as CSS transform-origin.
export function transformGesture(start: ImageTransform, startCenter: Point,
  currentCenter: Point, requestedRatio: number, deltaAngle: number): ImageTransform {
  const scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, start.scale * requestedRatio));
  const ratio = scale / start.scale;
  const delta = normalizeRadians(deltaAngle);
  const cos = Math.cos(delta), sin = Math.sin(delta);
  const x = origin.x + start.translateX - startCenter.x;
  const y = origin.y + start.translateY - startCenter.y;
  return {
    scale,
    rotation: ((start.rotation + delta * 180 / Math.PI) % 360 + 540) % 360 - 180,
    translateX: currentCenter.x - origin.x + ratio * (cos * x - sin * y),
    translateY: currentCenter.y - origin.y + ratio * (sin * x + cos * y),
  };
}
export function transformPoint(point: Point, transform: ImageTransform): Point {
  const radians = transform.rotation * Math.PI / 180;
  const x = (point.x - origin.x) * transform.scale;
  const y = (point.y - origin.y) * transform.scale;
  return {
    x: origin.x + transform.translateX + Math.cos(radians) * x - Math.sin(radians) * y,
    y: origin.y + transform.translateY + Math.sin(radians) * x + Math.cos(radians) * y,
  };
}
export function transformCSS(transform: ImageTransform): string {
  return `translate(${transform.translateX / PAPER_WIDTH * 100}%, ${transform.translateY / PAPER_HEIGHT * 100}%) rotate(${transform.rotation}deg) scale(${transform.scale})`;
}
