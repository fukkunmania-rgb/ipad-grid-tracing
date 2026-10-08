import { PAPER_WIDTH, PAPER_HEIGHT, EXPORT_WIDTH, EXPORT_HEIGHT } from '../types/index.js';
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

function setBrush(ctx: CanvasRenderingContext2D, stroke: Stroke) {
  ctx.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = stroke.size; // Deliberately constant; pressure is not read.
  ctx.strokeStyle = stroke.color;
  ctx.fillStyle = stroke.color;
}
export function drawSegment(ctx: CanvasRenderingContext2D, stroke: Stroke, a: Point, b: Point) {
  setBrush(ctx, stroke);
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
}
export function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke) {
  if (!stroke.points.length) return;
  setBrush(ctx, stroke);
  ctx.beginPath();
  const first = stroke.points[0];
  if (stroke.points.length === 1) {
    ctx.arc(first.x, first.y, stroke.size / 2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.moveTo(first.x, first.y);
    for (const point of stroke.points.slice(1)) ctx.lineTo(point.x, point.y);
    ctx.stroke();
  }
}
export function renderDrawing(canvas: HTMLCanvasElement, strokes: Stroke[]) {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('描画用Canvasを作成できない');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(canvas.width / PAPER_WIDTH, 0, 0, canvas.height / PAPER_HEIGHT, 0, 0);
  for (const stroke of strokes) drawStroke(ctx, stroke);
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
    ctx.fillRect(0, 0, PAPER_WIDTH, PAPER_HEIGHT);
    ctx.globalCompositeOperation = 'source-over';
  }
  return canvasBlob(canvas);
}
