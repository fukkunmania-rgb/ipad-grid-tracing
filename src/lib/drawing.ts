import { PAPER_WIDTH, EXPORT_WIDTH, EXPORT_HEIGHT } from '../types/index.js';
import type { Stroke, HistoryStatus, ExportBackground, Point } from '../types/index.js';

type Command = { kind: 'stroke'; stroke: Stroke } | { kind: 'clear' };

// Store stroke commands, never full-canvas ImageData snapshots. Clear is undoable.
export class DrawingHistory {
  private commands: Command[];
  private cursor: number;
  constructor(strokes: Stroke[] = []) {
    this.commands = strokes.map(stroke => ({ kind: 'stroke', stroke }));
    this.cursor = this.commands.length;
  }
  get status(): HistoryStatus {
    return { canUndo: this.cursor > 0, canRedo: this.cursor < this.commands.length };
  }
  getStrokes(): Stroke[] {
    let start = this.cursor;
    while (start > 0 && this.commands[start - 1].kind !== 'clear') start--;
    return this.commands.slice(start, this.cursor).flatMap(command =>
      command.kind === 'stroke' ? [command.stroke] : []);
  }
  private append(command: Command) {
    this.commands = this.commands.slice(0, this.cursor);
    this.commands.push(command);
    this.cursor = this.commands.length;
  }
  commit(stroke: Stroke) {
    if (stroke.points.length) this.append({ kind: 'stroke', stroke });
  }
  undo() { if (this.cursor > 0) this.cursor--; }
  redo() { if (this.cursor < this.commands.length) this.cursor++; }
  clear() { if (this.getStrokes().length) this.append({ kind: 'clear' }); }
  reset() { this.commands = []; this.cursor = 0; }
}

function setBrush(ctx: CanvasRenderingContext2D, stroke: Stroke, scale: number) {
  ctx.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = stroke.size * scale; // Fixed document width; pressure is never read.
  ctx.strokeStyle = stroke.color;
  ctx.fillStyle = stroke.color;
}
export function drawSegment(ctx: CanvasRenderingContext2D, stroke: Stroke, a: Point, b: Point, scale = 1) {
  setBrush(ctx, stroke, scale);
  ctx.beginPath();
  ctx.moveTo(a.x * scale, a.y * scale);
  ctx.lineTo(b.x * scale, b.y * scale);
  ctx.stroke();
}
export function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke, scale = 1) {
  if (!stroke.points.length) return;
  setBrush(ctx, stroke, scale);
  ctx.beginPath();
  const first = stroke.points[0];
  if (stroke.points.length === 1) {
    ctx.arc(first.x * scale, first.y * scale, stroke.size * scale / 2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.moveTo(first.x * scale, first.y * scale);
    for (const point of stroke.points.slice(1)) ctx.lineTo(point.x * scale, point.y * scale);
    ctx.stroke();
  }
}
export function renderDrawing(canvas: HTMLCanvasElement, strokes: Stroke[]) {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('描画用Canvasを作成できない');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Map document -> bitmap explicitly, exactly once. Keep the context transform
  // at identity for both live ink and replay; this also avoids WebKit path scaling differences.
  const scale = canvas.width / PAPER_WIDTH;
  for (const stroke of strokes) drawStroke(ctx, stroke, scale);
  ctx.globalCompositeOperation = 'source-over';
  return ctx;
}
export function canvasBlob(canvas: HTMLCanvasElement, type = 'image/png', quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('画像の書き出しに失敗した')), type, quality);
  });
}
export async function exportDrawing(strokes: Stroke[], background: ExportBackground): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = EXPORT_WIDTH;
  canvas.height = EXPORT_HEIGHT;
  const ctx = renderDrawing(canvas, strokes);
  if (background === 'white') {
    // Fill AFTER erasing, underneath the ink, so erased areas remain white.
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'source-over';
  }
  return canvasBlob(canvas);
}
