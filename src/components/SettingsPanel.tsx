import React from 'react';
import type { GridSettings, CompareSettings } from '../types';

interface SettingsPanelProps {
  gridSettings: GridSettings;
  onGridSettingsChange: (settings: GridSettings) => void;
  compareSettings: CompareSettings;
  onCompareSettingsChange: (settings: CompareSettings) => void;
  hasReferenceImage: boolean;
}

const DIVISIONS: Array<2 | 4 | 6 | 8> = [2, 4, 6, 8];

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  gridSettings,
  onGridSettingsChange,
  compareSettings,
  onCompareSettingsChange,
  hasReferenceImage,
}) => {
  const sectionStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '0 16px',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#495057',
    whiteSpace: 'nowrap',
  };

  const buttonStyle = (selected: boolean): React.CSSProperties => ({
    padding: '8px 16px',
    border: selected ? '2px solid #4a90d9' : '2px solid #ced4da',
    borderRadius: '6px',
    background: selected ? '#4a90d9' : '#fff',
    color: selected ? '#fff' : '#495057',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s',
    WebkitTapHighlightColor: 'transparent',
    touchAction: 'manipulation',
    minWidth: '44px',
  });

  const toggleStyle = (enabled: boolean): React.CSSProperties => ({
    padding: '8px 20px',
    border: enabled ? '2px solid #28a745' : '2px solid #ced4da',
    borderRadius: '6px',
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

  const sliderContainerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px 16px',
        background: '#f8f9fa',
        borderTop: '1px solid #dee2e6',
        gap: '32px',
        flexWrap: 'wrap',
      }}
    >
      {/* Grid Settings */}
      <div style={sectionStyle}>
        <span style={labelStyle}>🔲 グリッド:</span>
        
        {/* Grid toggle */}
        <button
          style={{
            padding: '8px 12px',
            border: gridSettings.enabled ? '2px solid #4a90d9' : '2px solid #ced4da',
            borderRadius: '6px',
            background: gridSettings.enabled ? '#4a90d9' : '#fff',
            color: gridSettings.enabled ? '#fff' : '#495057',
            fontSize: '13px',
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}
          onClick={() =>
            onGridSettingsChange({
              ...gridSettings,
              enabled: !gridSettings.enabled,
            })
          }
        >
          {gridSettings.enabled ? 'ON' : 'OFF'}
        </button>

        {/* Division buttons */}
        {gridSettings.enabled && (
          <div style={{ display: 'flex', gap: '6px' }}>
            {DIVISIONS.map((div) => (
              <button
                key={div}
                style={buttonStyle(gridSettings.divisions === div)}
                onClick={() =>
                  onGridSettingsChange({
                    ...gridSettings,
                    divisions: div,
                  })
                }
              >
                {div}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Divider */}
      <div
        style={{
          width: '1px',
          height: '32px',
          background: '#dee2e6',
        }}
      />

      {/* Compare Settings */}
      <div style={sectionStyle}>
        <span style={labelStyle}>👁️ 比較:</span>
        
        <button
          style={toggleStyle(compareSettings.enabled)}
          onClick={() => {
            if (hasReferenceImage) {
              onCompareSettingsChange({
                ...compareSettings,
                enabled: !compareSettings.enabled,
              });
            }
          }}
          disabled={!hasReferenceImage}
        >
          {compareSettings.enabled ? 'ON' : 'OFF'}
        </button>

        {compareSettings.enabled && hasReferenceImage && (
          <div style={sliderContainerStyle}>
            <span style={{ fontSize: '12px', color: '#6c757d' }}>透明度:</span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(compareSettings.opacity * 100)}
              onChange={(e) =>
                onCompareSettingsChange({
                  ...compareSettings,
                  opacity: parseInt(e.target.value) / 100,
                })
              }
              style={{
                width: '120px',
                cursor: 'pointer',
              }}
            />
            <span style={{ fontSize: '12px', color: '#495057', minWidth: '36px' }}>
              {Math.round(compareSettings.opacity * 100)}%
            </span>
          </div>
        )}
      </div>

      {/* Pen Size (Quick Access) */}
      <div style={sectionStyle}>
        <span style={labelStyle}>🎨 ペン太さ:</span>
        <div style={{ display: 'flex', gap: '6px' }}>
          {[2, 4, 8, 12, 20].map((size) => (
            <button
              key={size}
              style={{
                width: '32px',
                height: '32px',
                border: '2px solid #ced4da',
                borderRadius: '50%',
                background: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
              }}
              onClick={() => {
                // This will be handled by parent
                const event = new CustomEvent('penSizeChange', { detail: size });
                window.dispatchEvent(event);
              }}
            >
              <div
                style={{
                  width: size,
                  height: size,
                  borderRadius: '50%',
                  background: '#333',
                }}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
