import { useCallback, useEffect, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { ImageTransform, Point, ReferenceAsset } from '../types';
import { angle, center, distance, toDocumentPoint, transformGesture } from '../lib/geometry';

interface Pointer { point: Point; type: string }
interface Gesture {
  transform: ImageTransform;
  center: Point;
  distance: number;
  angle: number;
}
export function useImageGesture(enabled: boolean, transform: ImageTransform,
  onChange: (transform: ImageTransform) => void, asset: ReferenceAsset | null) {
  const elementRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, Pointer>());
  const gesture = useRef<Gesture | null>(null);
  const latest = useRef<ImageTransform>(transform);
  const pending = useRef<ImageTransform | null>(null);
  const frame = useRef<number | null>(null);

  const flush = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    if (pending.current) { onChange(pending.current); pending.current = null; }
  }, [onChange]);
  const schedule = (next: ImageTransform) => {
    latest.current = next;
    pending.current = next;
    if (frame.current === null) frame.current = requestAnimationFrame(flush);
  };
  const rebase = () => {
    const values = [...pointers.current.values()];
    if (values.length === 2) {
      const [a, b] = values.map(value => value.point);
      gesture.current = { transform: { ...latest.current }, center: center(a, b), distance: distance(a, b), angle: angle(a, b) };
    } else if (values.length === 1 && values[0].type !== 'touch') {
      gesture.current = { transform: { ...latest.current }, center: values[0].point, distance: 1, angle: 0 };
    } else gesture.current = null;
  };

  useEffect(() => {
    if (!pointers.current.size) latest.current = transform;
  }, [transform]);
  useEffect(() => {
    const element = elementRef.current;
    const activePointers = pointers.current;
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = null;
      pending.current = null;
      gesture.current = null;
      const ids = [...activePointers.keys()];
      activePointers.clear();
      for (const id of ids) if (element?.hasPointerCapture(id)) element.releasePointerCapture(id);
    };
  }, [enabled, asset]);

  const down = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!enabled || event.button !== 0 || pointers.current.size >= 2) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    if (!pointers.current.size) latest.current = transform;
    pointers.current.set(event.pointerId, {
      point: toDocumentPoint(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect()),
      type: event.pointerType,
    });
    rebase();
  };
  const move = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!enabled || !pointers.current.has(event.pointerId)) return;
    event.preventDefault();
    // Update even the first finger before a second finger starts the gesture.
    pointers.current.set(event.pointerId, {
      point: toDocumentPoint(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect()),
      type: event.pointerType,
    });
    const start = gesture.current;
    if (!start) return;
    const values = [...pointers.current.values()];
    if (values.length === 2) {
      const [a, b] = values.map(value => value.point);
      if (start.distance < 1) { rebase(); return; }
      schedule(transformGesture(start.transform, start.center, center(a, b), distance(a, b) / start.distance, angle(a, b) - start.angle));
    } else if (values.length === 1 && values[0].type !== 'touch') {
      schedule(transformGesture(start.transform, start.center, values[0].point, 1, 0));
    }
  };
  const up = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    if (event.type === 'pointerup') move(event);
    flush();
    pointers.current.delete(event.pointerId);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    rebase();
  };
  return { elementRef, down, move, up };
}
