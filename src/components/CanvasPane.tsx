import { useImperativeHandle } from 'react';
import type { Ref, RefObject } from 'react';
import type { CanvasHandle, HistoryStatus, Session, Stroke } from '../types';
import { useCanvas } from '../hooks/useCanvas';
import { GridOverlay } from './GridOverlay';
import { ReferenceImage } from './ReferenceImage';

interface Props {
  ref: Ref<CanvasHandle>;
  session: Session;
  initialStrokes: Stroke[];
  size: { width: number; height: number };
  viewportRef: RefObject<HTMLDivElement | null>;
  onChange: (strokes: Stroke[], status: HistoryStatus) => void;
  onStart: () => void;
}
export function CanvasPane({ ref, session, initialStrokes, size, viewportRef, onChange, onStart }: Props) {
  const { canvasRef, startDrawing, draw, stopDrawing, actions } = useCanvas({
    ...size, tool: session.tool, penSize: session.penSize, eraserSize: session.eraserSize,
    initialStrokes, onChange, onStart,
  });
  useImperativeHandle(ref, () => actions, [actions]);
  return <section className="pane drawing-pane" aria-label="描画キャンバス">
    <header className="pane-header"><h2>描画</h2><span className="pane-hint">
      {session.compare.enabled ? '比較表示中' : 'Apple Pencil / マウス'}
    </span></header>
    <div className="paper-viewport"><div className="paper-slot" ref={viewportRef}>
      <div className="paper" data-testid="drawing-paper" style={size}>
        {session.compare.enabled && session.reference && <ReferenceImage asset={session.reference}
          transform={session.transform} grayscale={session.grayscale} opacity={session.compare.opacity} />}
        <canvas ref={canvasRef} className="drawing-canvas" aria-label="描画面（Apple Pencilまたはマウスで描画）"
          onPointerDown={startDrawing} onPointerMove={draw} onPointerUp={stopDrawing}
          onPointerCancel={stopDrawing} onLostPointerCapture={stopDrawing}
          onContextMenu={event => event.preventDefault()}
          style={{ cursor: session.tool === 'pen' ? 'crosshair' : 'cell' }} />
        <GridOverlay {...size} settings={session.grid} />
      </div>
    </div></div>
    <footer className="pane-footer">{session.tool === 'pen' ? `ペン ${session.penSize}` : `消しゴム ${session.eraserSize}`}px · 固定線幅</footer>
  </section>;
}
