import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { CanvasHandle, HistoryStatus, Stroke, Tool, ExportBackground } from '../types';
import { DrawingHistory, drawSegment, drawStroke, exportDrawing, renderDrawing } from '../lib/drawing';
import { PAPER_WIDTH, PAPER_HEIGHT } from '../types';
import { toDocumentPoint } from '../lib/geometry';

interface Options {
  width: number;
  height: number;
  tool: Tool;
  penSize: number;
  eraserSize: number;
  initialStrokes: Stroke[];
  onChange: (strokes: Stroke[], status: HistoryStatus) => void;
  onStart: () => void;
}
interface ActiveStroke { pointerId: number; stroke: Stroke }

export function useCanvas({ width, height, tool, penSize, eraserSize, initialStrokes, onChange, onStart }: Options) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef<ActiveStroke | null>(null);
  const [history] = useState(() => new DrawingHistory(initialStrokes));

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    // Preserve exact 4:5 bitmap dimensions, so one uniform scale covers both axes.
    const paperScale = Math.min(width / PAPER_WIDTH, height / PAPER_HEIGHT);
    const unit = Math.max(1, Math.ceil(PAPER_WIDTH * paperScale * dpr / 4));
    const w = unit * 4, h = unit * 5;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    const ctx = renderDrawing(canvas, history.getStrokes());
    if (activeRef.current) drawStroke(ctx, activeRef.current.stroke, canvas.width / PAPER_WIDTH);
  }, [width, height, history]);

  useLayoutEffect(() => { redraw(); }, [redraw]);
  useEffect(() => {
    window.addEventListener('resize', redraw);
    return () => window.removeEventListener('resize', redraw);
  }, [redraw]);

  const notify = useCallback(() => {
    redraw();
    onChange(history.getStrokes(), history.status);
  }, [redraw, history, onChange]);

  const appendSamples = useCallback((event: PointerEvent) => {
    const active = activeRef.current;
    const canvas = canvasRef.current;
    if (!active || !canvas || active.pointerId !== event.pointerId || event.pointerType === 'touch') return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const coalesced = event.getCoalescedEvents?.();
    // Include the dispatching event as well; duplicate coordinates are ignored.
    const samples = coalesced?.length ? [...coalesced, event] : [event];
    for (const sample of samples) {
      const point = toDocumentPoint(sample.clientX, sample.clientY, rect);
      const last = active.stroke.points[active.stroke.points.length - 1];
      if (point.x === last.x && point.y === last.y) continue;
      active.stroke.points.push(point);
      drawSegment(ctx, active.stroke, last, point, canvas.width / PAPER_WIDTH);
    }
  }, []);

  const finish = useCallback(() => {
    const active = activeRef.current;
    if (!active) return;
    // Clear first: releasing capture can synchronously trigger lostpointercapture.
    activeRef.current = null;
    const canvas = canvasRef.current;
    if (canvas?.hasPointerCapture(active.pointerId)) canvas.releasePointerCapture(active.pointerId);
    history.commit(active.stroke);
    notify();
  }, [history, notify]);

  // Keep already sampled ink on interruption, without inventing a cancellation endpoint.
  useEffect(() => {
    const hide = () => { if (document.visibilityState === 'hidden') finish(); };
    window.addEventListener('blur', finish);
    document.addEventListener('visibilitychange', hide);
    return () => {
      window.removeEventListener('blur', finish);
      document.removeEventListener('visibilitychange', hide);
    };
  }, [finish]);

  const startDrawing = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (event.button !== 0 || event.pointerType === 'touch' || activeRef.current) return;
    event.preventDefault();
    const canvas = event.currentTarget;
    // Capture a real active pointer before starting a stroke.
    canvas.setPointerCapture(event.pointerId);
    const point = toDocumentPoint(event.clientX, event.clientY, canvas.getBoundingClientRect());
    const stroke: Stroke = { tool, size: tool === 'pen' ? penSize : eraserSize, color: '#000000', points: [point] };
    activeRef.current = { pointerId: event.pointerId, stroke };
    const ctx = canvas.getContext('2d');
    if (ctx) drawStroke(ctx, stroke, canvas.width / PAPER_WIDTH);
    onStart();
  };
  const draw = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (activeRef.current?.pointerId !== event.pointerId || event.pointerType === 'touch') return;
    event.preventDefault();
    appendSamples(event.nativeEvent);
  };
  const stopDrawing = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (activeRef.current?.pointerId !== event.pointerId || event.pointerType === 'touch') return;
    if (event.type === 'pointerup') appendSamples(event.nativeEvent);
    finish();
  };

  const actions: CanvasHandle = {
    undo() { finish(); history.undo(); notify(); },
    redo() { finish(); history.redo(); notify(); },
    clear() { finish(); history.clear(); notify(); },
    reset() { finish(); history.reset(); notify(); },
    finish,
    exportPNG(background: ExportBackground) { finish(); return exportDrawing(history.getStrokes(), background); },
  };
  return { canvasRef, startDrawing, draw, stopDrawing, actions };
}
