import type { Tool, CompareSettings } from '../types';

interface ToolbarProps {
  currentTool: Tool;
  onToolChange: (tool: Tool) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onExport: () => void;
  compareSettings: CompareSettings;
  onCompareSettingsChange: (settings: CompareSettings) => void;
  hasReferenceImage: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  currentTool,
  onToolChange,
  onUndo,
  onRedo,
  onClear,
  canUndo,
  canRedo,
  onExport,
  compareSettings,
  onCompareSettingsChange,
  hasReferenceImage,
}) => {
  const toolButtonStyle = (tool: Tool): React.CSSProperties => ({
    padding: '12px 20px',
    margin: '0 4px',
    border: '2px solid #ccc',
    borderRadius: '8px',
    background: currentTool === tool ? '#4a90d9' : '#fff',
    color: currentTool === tool ? '#fff' : '#333',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s',
    WebkitTapHighlightColor: 'transparent',
    touchAction: 'manipulation',
    minWidth: '70px',
  });

  const actionButtonStyle = (enabled: boolean): React.CSSProperties => ({
    padding: '12px 16px',
    margin: '0 4px',
    border: '2px solid #ccc',
    borderRadius: '8px',
    background: enabled ? '#fff' : '#f0f0f0',
    color: enabled ? '#333' : '#999',
    fontSize: '14px',
    cursor: enabled ? 'pointer' : 'not-allowed',
    opacity: enabled ? 1 : 0.5,
    transition: 'all 0.2s',
    WebkitTapHighlightColor: 'transparent',
    touchAction: 'manipulation',
    minWidth: '60px',
  });

  const dangerButtonStyle: React.CSSProperties = {
    padding: '12px 16px',
    margin: '0 4px',
    border: '2px solid #dc3545',
    borderRadius: '8px',
    background: '#fff',
    color: '#dc3545',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    WebkitTapHighlightColor: 'transparent',
    touchAction: 'manipulation',
    minWidth: '60px',
  };

  const exportButtonStyle: React.CSSProperties = {
    padding: '12px 20px',
    margin: '0 4px',
    border: '2px solid #28a745',
    borderRadius: '8px',
    background: '#28a745',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s',
    WebkitTapHighlightColor: 'transparent',
    touchAction: 'manipulation',
  };

  const compareButtonStyle = (enabled: boolean): React.CSSProperties => ({
    padding: '12px 16px',
    margin: '0 4px',
    border: enabled ? '2px solid #28a745' : '2px solid #ced4da',
    borderRadius: '8px',
    background: enabled ? '#28a745' : '#fff',
    color: enabled ? '#fff' : '#495057',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: hasReferenceImage ? 'pointer' : 'not-allowed',
    opacity: hasReferenceImage ? 1 : 0.5,
    transition: 'all 0.2s',
    WebkitTapHighlightColor: 'transparent',
    touchAction: 'manipulation',
  });

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px 16px',
        background: '#f8f9fa',
        borderBottom: '1px solid #dee2e6',
        flexWrap: 'wrap',
        gap: '8px',
      }}
    >
      {/* Clear - Leftmost */}
      <button
        style={dangerButtonStyle}
        onClick={onClear}
        aria-label="クリア"
      >
        Clear
      </button>

      {/* Export */}
      <button
        style={exportButtonStyle}
        onClick={onExport}
        aria-label="PNG保存"
      >
        保存
      </button>

      {/* Divider */}
      <div style={{ width: '2px', height: '36px', background: '#dee2e6', margin: '0 8px' }} />

      {/* History Controls - Middle-right */}
      <div style={{ display: 'flex', marginRight: '8px' }}>
        <button
          style={actionButtonStyle(canUndo)}
          onClick={onUndo}
          disabled={!canUndo}
          aria-label="元に戻す"
        >
          Undo
        </button>
        <button
          style={actionButtonStyle(canRedo)}
          onClick={onRedo}
          disabled={!canRedo}
          aria-label="やり直し"
        >
          Redo
        </button>
      </div>

      {/* Divider */}
      <div style={{ width: '2px', height: '36px', background: '#dee2e6', margin: '0 8px' }} />

      {/* Compare Button - Middle */}
      <button
        style={compareButtonStyle(compareSettings.enabled)}
        onClick={() => {
          if (hasReferenceImage) {
            onCompareSettingsChange({
              ...compareSettings,
              enabled: !compareSettings.enabled,
            });
          }
        }}
        disabled={!hasReferenceImage}
        aria-label="比較"
      >
        比較
      </button>

      {/* Divider */}
      <div style={{ width: '2px', height: '36px', background: '#dee2e6', margin: '0 8px' }} />

      {/* Tool Selection - Rightmost */}
      <div style={{ display: 'flex' }}>
        <button
          style={toolButtonStyle('pen')}
          onClick={() => onToolChange('pen')}
          aria-label="ペン"
        >
          ペン
        </button>
        <button
          style={toolButtonStyle('eraser')}
          onClick={() => onToolChange('eraser')}
          aria-label="消しゴム"
        >
          消し
        </button>
      </div>
    </div>
  );
};
