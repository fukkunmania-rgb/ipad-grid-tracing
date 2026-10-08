import type { HistoryStatus, Session } from '../types';

interface Props {
  session: Session;
  history: HistoryStatus;
  settingsOpen: boolean;
  exporting: boolean;
  onChange: (patch: Partial<Session>) => void;
  onUndo: () => void;
  onRedo: () => void;
  onExport: () => void;
  onToggleSettings: () => void;
}
export function Toolbar({ session, history, settingsOpen, exporting, onChange, onUndo, onRedo, onExport, onToggleSettings }: Props) {
  return <header className="toolbar" aria-label="描画ツール">
    <h1>グリッド模写</h1>
    <div className="button-group" aria-label="ツール選択">
      <button aria-pressed={session.tool === 'pen'} onClick={() => onChange({ tool: 'pen' })}>ペン</button>
      <button aria-pressed={session.tool === 'eraser'} onClick={() => onChange({ tool: 'eraser' })}>消しゴム</button>
      <label className="compact-label">太さ
        <select aria-label={session.tool === 'pen' ? 'ペンの太さ' : '消しゴムの太さ'}
          value={session.tool === 'pen' ? session.penSize : session.eraserSize}
          onChange={event => onChange(session.tool === 'pen' ? { penSize: Number(event.target.value) } : { eraserSize: Number(event.target.value) })}>
          {(session.tool === 'pen' ? [2, 4, 8, 12, 20] : [8, 20, 40, 60]).map(size => <option key={size} value={size}>{size}px</option>)}
        </select>
      </label>
    </div>
    <div className="button-group">
      <button onClick={onUndo} disabled={!history.canUndo} aria-label="元に戻す" title="Ctrl / ⌘ Z">戻す</button>
      <button onClick={onRedo} disabled={!history.canRedo} aria-label="やり直す" title="Ctrl / ⌘ Shift Z">やり直す</button>
    </div>
    <button disabled={!session.reference} aria-pressed={session.compare.enabled}
      onClick={() => onChange({ compare: { ...session.compare, enabled: !session.compare.enabled } })}>比較</button>
    {session.compare.enabled && <label className="compact-label compare-control">参照画像の濃さ
      <input aria-label="参照画像の濃さ" type="range" min="0" max="100"
        value={Math.round(session.compare.opacity * 100)}
        onChange={event => onChange({ compare: { ...session.compare, opacity: Number(event.target.value) / 100 } })} />
      <output>{Math.round(session.compare.opacity * 100)}%</output>
    </label>}
    <div className="button-group toolbar-end">
      <button className="primary" onClick={onExport} disabled={exporting}>{exporting ? '書き出し中…' : 'PNG保存'}</button>
      <button aria-expanded={settingsOpen} aria-controls="settings-panel" onClick={onToggleSettings}>設定</button>
    </div>
  </header>;
}
