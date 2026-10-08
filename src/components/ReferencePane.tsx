import { useCallback, useRef } from 'react';
import type { RefObject } from 'react';
import type { Session } from '../types';
import { DEFAULT_TRANSFORM, MAX_SCALE, MIN_SCALE } from '../lib/geometry';
import { useImageGesture } from '../hooks/useImageGesture';
import { GridOverlay } from './GridOverlay';
import { ReferenceImage } from './ReferenceImage';

interface Props {
  session: Session;
  size: { width: number; height: number };
  viewportRef: RefObject<HTMLDivElement | null>;
  onChange: (patch: Partial<Session>) => void;
  onFile: (file: File) => void;
  loading: boolean;
}
export function ReferencePane({ session, size, viewportRef, onChange, onFile, loading }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const transformChanged = useCallback((transform: Session['transform']) => onChange({ transform }), [onChange]);
  const { elementRef, down, move, up } = useImageGesture(!!session.reference && !session.locked,
    session.transform, transformChanged, session.reference);
  const zoom = (factor: number) => onChange({ transform: {
    ...session.transform, scale: Math.max(MIN_SCALE, Math.min(MAX_SCALE, session.transform.scale * factor)),
  } });
  return <section className="pane reference-pane" aria-label="参考画像">
    <header className="pane-header"><h2>参考画像</h2>
      <div className="button-group">
        <button onClick={() => inputRef.current?.click()}>{session.reference ? '画像を変更' : '画像を選ぶ'}</button>
        <button disabled={!session.reference} aria-pressed={session.locked}
          onClick={() => onChange({ locked: !session.locked })}>{session.locked ? '位置固定中' : '位置を調整'}</button>
      </div>
    </header>
    <div className="paper-viewport" onDragOver={event => event.preventDefault()} onDrop={event => {
      event.preventDefault();
      const file = event.dataTransfer.files[0];
      if (file) onFile(file);
    }}><div className="paper-slot" ref={viewportRef}>
      <div className="paper reference-paper" data-testid="reference-paper" ref={elementRef} style={size}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        onLostPointerCapture={up} onContextMenu={event => event.preventDefault()}>
        {session.reference ? <ReferenceImage asset={session.reference} transform={session.transform} grayscale={session.grayscale} />
          : <div className="empty-reference"><p>画像を選んで模写を始める</p><small>PNG / JPEGなど<br />ドラッグ＆ドロップも対応</small></div>}
        <GridOverlay {...size} settings={session.grid} />
      </div>
    </div></div>
    <footer className="pane-footer reference-footer">
      <span>{loading ? '画像を処理中…' : session.reference ?
        session.locked ? '参考画像の位置を固定中' : '2本指で拡大・回転・移動 / マウスで移動' : '画像はサーバーに送信しない'}</span>
      {session.reference && <div className="button-group">
        <button aria-label="参考画像を縮小" disabled={session.locked || session.transform.scale <= MIN_SCALE} onClick={() => zoom(1 / 1.2)}>−</button>
        <output aria-label="参考画像の倍率">{Math.round(session.transform.scale * 100)}%</output>
        <button aria-label="参考画像を拡大" disabled={session.locked || session.transform.scale >= MAX_SCALE} onClick={() => zoom(1.2)}>＋</button>
        <button aria-pressed={session.grayscale} onClick={() => onChange({ grayscale: !session.grayscale })}>白黒</button>
        <button disabled={session.locked} onClick={() => onChange({ transform: { ...DEFAULT_TRANSFORM } })}>位置リセット</button>
      </div>}
    </footer>
    <input ref={inputRef} type="file" accept="image/*" aria-label="参考画像ファイル" className="file-input"
      onChange={event => {
        const file = event.currentTarget.files?.[0];
        event.currentTarget.value = ''; // Selecting the same file must fire again.
        if (file) onFile(file);
      }} />
  </section>;
}
