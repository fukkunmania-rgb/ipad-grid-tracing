import { useEffect, useRef, useState } from 'react';
import type { Session, Stroke } from '../types';
import { saveSession } from '../lib/storage';

export function useAutoSave(session: Session) {
  const latest = useRef(session);
  const previousStrokes = useRef<Stroke[] | null>(null);
  const [result, setResult] = useState<{ session: Session | null; error: string | null }>({ session: null, error: null });
  useEffect(() => {
    latest.current = session;
    let cancelled = false;
    // Settings/gestures are coalesced; explicit lifecycle flushing is best effort.
    const persist = () => {
      saveSession(session).then(() => {
        if (!cancelled) setResult({ session, error: null });
      }).catch(() => {
        if (!cancelled) setResult({ session, error: '自動保存に失敗。PNG保存で描画を残してほしい' });
      });
    };
    const drawingChanged = previousStrokes.current !== session.strokes;
    previousStrokes.current = session.strokes;
    // Completed strokes are saved immediately; only settings changes wait.
    const timeout = drawingChanged ? null : setTimeout(persist, 250);
    if (drawingChanged) persist();
    return () => { cancelled = true; if (timeout !== null) clearTimeout(timeout); };
  }, [session]);
  useEffect(() => {
    const flush = () => { void saveSession(latest.current).catch(() => {}); };
    const hide = () => { if (document.visibilityState === 'hidden') flush(); };
    document.addEventListener('visibilitychange', hide);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', hide);
      window.removeEventListener('pagehide', flush);
    };
  }, []);
  if (result.error) return result.error;
  return result.session === session ? 'この端末に保存済み' : '保存中…';
}
