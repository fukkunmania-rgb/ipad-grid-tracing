import { useCallback, useEffect, useRef, useState } from 'react';
import { Toolbar } from './components/Toolbar';
import { ReferencePane } from './components/ReferencePane';
import { CanvasPane } from './components/CanvasPane';
import { SettingsPanel } from './components/SettingsPanel';
import { usePaperSize } from './hooks/usePaperSize';
import { useAutoSave } from './hooks/useAutoSave';
import { newSession } from './lib/session-schema';
import { loadSession } from './lib/storage';
import { readReference } from './lib/images';
import { DEFAULT_TRANSFORM } from './lib/geometry';
import type { CanvasHandle, HistoryStatus, Session, Stroke } from './types';
import './App.css';

function Editor({ initialSession }: { initialSession: Session }) {
  const [session, setSession] = useState(initialSession);
  const [history, setHistory] = useState<HistoryStatus>({ canUndo: initialSession.strokes.length > 0, canRedo: false });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [loadingImage, setLoadingImage] = useState(false);
  const [notice, setNotice] = useState('');
  const imageRequest = useRef(0);
  const canvas = useRef<CanvasHandle>(null);
  const { referenceRef, drawingRef, size } = usePaperSize();
  const saveStatus = useAutoSave(session);

  const change = useCallback((patch: Partial<Session>) => {
    setSession(previous => ({ ...previous, ...patch }));
  }, []);
  const drawingChanged = useCallback((strokes: Stroke[], status: HistoryStatus) => {
    setSession(previous => ({ ...previous, strokes }));
    setHistory(status);
  }, []);
  const drawingStarted = useCallback(() => {
    setSession(previous => previous.reference && !previous.locked ? { ...previous, locked: true } : previous);
  }, []);

  const importImage = async (file: File) => {
    const request = ++imageRequest.current;
    setLoadingImage(true);
    setNotice('');
    try {
      const reference = await readReference(file);
      if (request !== imageRequest.current) return;
      change({ reference, transform: { ...DEFAULT_TRANSFORM }, locked: false });
      setNotice('参考画像を読み込んだ。位置を合わせてから描き始める');
    } catch (error) {
      if (request === imageRequest.current) setNotice(error instanceof Error ? error.message : '画像の読み込みに失敗した');
    } finally {
      if (request === imageRequest.current) setLoadingImage(false);
    }
  };
  useEffect(() => () => { imageRequest.current++; }, []);

  const exportPNG = useCallback(async () => {
    if (!canvas.current || exporting) return;
    setExporting(true);
    try {
      const blob = await canvas.current.exportPNG(session.exportBackground);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `tracing-${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setNotice(`PNGを書き出した（${session.exportBackground === 'white' ? '白背景' : '透明背景'}・576 × 720px・線画のみ）`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'PNG保存に失敗した');
    } finally { setExporting(false); }
  }, [exporting, session.exportBackground]);

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      const target = event.target;
      if (event.defaultPrevented || (target instanceof HTMLElement && target.closest('input, textarea, select, [contenteditable="true"]'))) return;
      if (event.metaKey || event.ctrlKey) {
        const key = event.key.toLowerCase();
        if (key === 'z') { event.preventDefault(); if (event.shiftKey) canvas.current?.redo(); else canvas.current?.undo(); }
        if (key === 'y') { event.preventDefault(); canvas.current?.redo(); }
        if (key === 's') { event.preventDefault(); void exportPNG(); }
      }
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [exportPNG]);

  const clear = () => {
    canvas.current?.finish();
    if (window.confirm('描画をすべて消去する？「戻す」で復元できる。')) canvas.current?.clear();
  };
  const startNew = () => {
    if (!window.confirm('画像・描画・設定を初期化して新しい練習を始める？現在の練習には戻れない。必要な描画は先にPNG保存してほしい。')) return;
    imageRequest.current++;
    setLoadingImage(false);
    canvas.current?.reset();
    setSession(newSession());
    setNotice('新しい練習を開始した');
  };

  return <main className="editor">
    <Toolbar session={session} history={history} settingsOpen={settingsOpen} exporting={exporting}
      onChange={change} onUndo={() => canvas.current?.undo()} onRedo={() => canvas.current?.redo()}
      onExport={() => void exportPNG()} onToggleSettings={() => setSettingsOpen(value => !value)} />
    <SettingsPanel session={session} open={settingsOpen} onChange={change} onClear={clear} onNew={startNew} />
    <div className="workspace">
      <ReferencePane session={session} size={size} viewportRef={referenceRef} onChange={change}
        onFile={file => void importImage(file)} loading={loadingImage} />
      <CanvasPane ref={canvas} session={session} initialStrokes={initialSession.strokes} size={size}
        viewportRef={drawingRef} onChange={drawingChanged} onStart={drawingStarted} />
    </div>
    <footer className="status-bar"><span role="status">{notice || '指では描画しない。補助グリッドを目印に描く。'}</span>
      <span data-testid="save-status">{saveStatus}</span></footer>
  </main>;
}

function App() {
  const [boot, setBoot] = useState<{ session: Session } | { error: string } | null>(null);
  useEffect(() => {
    let cancelled = false;
    loadSession().then(session => {
      if (!cancelled) setBoot({ session: session ?? newSession() });
    }).catch(error => {
      if (!cancelled) setBoot({ error: error instanceof Error ? error.message : '保存データを読み込めない' });
    });
    return () => { cancelled = true; };
  }, []);
  if (!boot) return <main className="boot-screen"><p role="status">前回の練習を確認中…</p></main>;
  if ('error' in boot) return <main className="boot-screen"><h1>前回の練習を復元できない</h1>
    <p role="alert">{boot.error}</p><p>保存データはまだ上書きしていない。</p>
    <button onClick={() => window.location.reload()}>再読み込み</button>
    <button className="danger" onClick={() => {
      if (window.confirm('前回の保存内容を上書きして、新しい練習を始める？')) setBoot({ session: newSession() });
    }}>復元せずに新しく始める</button></main>;
  return <Editor initialSession={boot.session} />;
}
export default App;
