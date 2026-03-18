import React from 'react';
import type { Tool } from '../types';

interface ToolbarProps {
  currentTool: Tool;
  onToolChange: (tool: Tool) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onExport: () => void;
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
    margin: '0 4px 0 16px',
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
      {/* Tool Selection */}
      <div style={{ display: 'flex', marginRight: '16px' }}>
        <button
          style={toolButtonStyle('pen')}
          onClick={() => onToolChange('pen')}
          aria-label="ペン"
        >
          ✏️ ペン
        </button>
        <button
          style={toolButtonStyle('eraser')}
          onClick={() => onToolChange('eraser')}
          aria-label="消しゴム"
        >
          🧽 消し
        </button>
      </div>

      {/* History Controls */}
      <div style={{ display: 'flex', marginRight: '16px' }}>
        <button
          style={actionButtonStyle(canUndo)}
          onClick={onUndo}
          disabled={!canUndo}
          aria-label="元に戻す"
        >
          ↩️ Undo
        </button>
        <button
          style={actionButtonStyle(canRedo)}
          onClick={onRedo}
          disabled={!canRedo}
          aria-label="やり直し"
        >
          ↪️ Redo
        </button>
      </div>

      {/* Clear */}
      <button
        style={dangerButtonStyle}
        onClick={onClear}
        aria-label="クリア"
      >
        🗑️ Clear
      </button>

      {/* Export */}
      <button
        style={exportButtonStyle}
        onClick={onExport}
        aria-label="PNG保存"
      >
        💾 保存
      </button>
    </div>
  );
};
