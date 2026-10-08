import type { Session, GridColor, ExportBackground } from '../types';

interface Props {
  session: Session;
  open: boolean;
  onChange: (patch: Partial<Session>) => void;
  onClear: () => void;
  onNew: () => void;
}
export function SettingsPanel({ session, open, onChange, onClear, onNew }: Props) {
  return <section id="settings-panel" className="settings-panel" hidden={!open} aria-label="設定">
    <fieldset><legend>グリッド（補助線付き）</legend>
      <button aria-pressed={session.grid.enabled} onClick={() => onChange({ grid: { ...session.grid, enabled: !session.grid.enabled } })}>
        {session.grid.enabled ? 'グリッド ON' : 'グリッド OFF'}</button>
      <label>分割<select aria-label="グリッドの分割" disabled={!session.grid.enabled} value={session.grid.multiplier}
        onChange={event => onChange({ grid: { ...session.grid, multiplier: Number(event.target.value) as 1 | 2 } })}>
        <option value="1">4 × 5</option><option value="2">8 × 10</option>
      </select></label>
      <label>色<select aria-label="グリッドの色" disabled={!session.grid.enabled} value={session.grid.colorKey}
        onChange={event => onChange({ grid: { ...session.grid, colorKey: event.target.value as GridColor } })}>
        <option value="red">赤</option><option value="black">黒</option><option value="blue">青</option><option value="green">緑</option>
      </select></label>
      <label>線幅<select aria-label="グリッドの線幅" disabled={!session.grid.enabled} value={session.grid.lineWidth}
        onChange={event => onChange({ grid: { ...session.grid, lineWidth: Number(event.target.value) } })}>
        <option value="1">細め</option><option value="1.5">標準</option><option value="2">太め</option>
      </select></label>
    </fieldset>
    <fieldset><legend>PNG保存</legend>
      <label>背景<select aria-label="保存画像の背景" value={session.exportBackground}
        onChange={event => onChange({ exportBackground: event.target.value as ExportBackground })}>
        <option value="white">白</option><option value="transparent">透明</option>
      </select></label><small>線画のみ・576 × 720px<br />参考画像とグリッドは含まない</small>
    </fieldset>
    <fieldset className="danger-zone"><legend>描画の管理</legend>
      <button className="danger" disabled={!session.strokes.length} onClick={onClear}>描画を消去</button>
      <button className="danger" onClick={onNew}>新しい練習</button>
      <small>画像の変更では描画を保持。<br />新しい練習では画像・描画・設定を初期化。</small>
    </fieldset>
  </section>;
}
