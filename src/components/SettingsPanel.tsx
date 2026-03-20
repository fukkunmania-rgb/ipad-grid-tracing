import { useState, useEffect } from 'react';
import type { GridSettings, CompareSettings } from '../types';

interface SettingsPanelProps {
  gridSettings: GridSettings;
  onGridSettingsChange: (settings: GridSettings) => void;
  compareSettings: CompareSettings;
  onCompareSettingsChange: (settings: CompareSettings) => void;
  hasReferenceImage: boolean;
  currentPenSize: number;
}

const MULTIPLIERS: Array<1 | 2> = [1, 2];
const PEN_SIZES = [2, 4, 8, 12, 20];

// Get grid size label (e.g., "4x5", "8x10")
const getGridSizeLabel = (multiplier: number) => {
  const x = 4 * multiplier;
  const y = 5 * multiplier;
  return `${x}x${y}`;
};

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  gridSettings,
  onGridSettingsChange,
  compareSettings,
  onCompareSettingsChange,
  hasReferenceImage,
  currentPenSize,
}) => {
  const [selectedPenSize, setSelectedPenSize] = useState(currentPenSize);

  // Sync with parent state
  useEffect(() => {
    setSelectedPenSize(currentPenSize);
  }, [currentPenSize]);

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
    minWidth: 'fit-content',
  };

  const buttonStyle = (selected: boolean, disabled = false): React.CSSProperties => ({
    padding: '8px 16px',
    border: selected ? '2px solid #4a90d9' : '2px solid #ced4da',
    borderRadius: '6px',
    background: selected ? '#4a90d9' : '#fff',
    color: selected ? '#fff' : '#495057',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    transition: 'all 0.2s',
    WebkitTapHighlightColor: 'transparent',
    touchAction: 'manipulation',
    minWidth: '44px',
  });

  const handlePenSizeClick = (size: number) => {
    setSelectedPenSize(size);
    const event = new CustomEvent('penSizeChange', { detail: size });
    window.dispatchEvent(event);
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '10px 16px',
        background: '#f8f9fa',
        borderBottom: '1px solid #dee2e6',
        gap: '24px',
        flexWrap: 'wrap',
      }}
    >
      {/* Grid Settings */}
      <div style={sectionStyle}>
        <span style={labelStyle}>グリッド:</span>
        
        {/* Grid toggle */}
        <button
          style={{
            padding: '8px 16px',
            border: gridSettings.enabled ? '2px solid #4a90d9' : '2px solid #ced4da',
            borderRadius: '6px',
            background: gridSettings.enabled ? '#4a90d9' : '#fff',
            color: gridSettings.enabled ? '#fff' : '#495057',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
            touchAction: 'manipulation',
            minWidth: '60px',
            transition: 'all 0.2s',
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

        {/* Multiplier buttons - maintains 4:5 ratio */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: '#6c757d' }}>分割:</span>
          {MULTIPLIERS.map((m) => (
            <button
              key={m}
              style={buttonStyle(
                gridSettings.enabled && gridSettings.multiplier === m,
                !gridSettings.enabled
              )}
              onClick={() => {
                if (gridSettings.enabled) {
                  onGridSettingsChange({
                    ...gridSettings,
                    multiplier: m,
                  });
                }
              }}
              disabled={!gridSettings.enabled}
              title={getGridSizeLabel(m)}
            >
              {getGridSizeLabel(m)}
            </button>
          ))}
        </div>

        {/* Grid color selection */}
        <div style={{ display: 'flex', gap: '4px', marginLeft: '8px' }}>
          {(['red', 'black', 'blue', 'green'] as const).map((color) => (
            <button
              key={color}
              onClick={() => {
                if (gridSettings.enabled) {
                  onGridSettingsChange({
                    ...gridSettings,
                    colorKey: color,
                  });
                }
              }}
              disabled={!gridSettings.enabled}
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '4px',
                border: gridSettings.colorKey === color ? '3px solid #333' : '2px solid #ccc',
                background: color === 'red' ? '#ff4444' : 
                           color === 'black' ? '#333333' : 
                           color === 'blue' ? '#4488ff' : '#44aa44',
                cursor: gridSettings.enabled ? 'pointer' : 'not-allowed',
                opacity: gridSettings.enabled ? 1 : 0.3,
                padding: 0,
              }}
              title={color === 'red' ? '赤' : color === 'black' ? '黒' : color === 'blue' ? '青' : '緑'}
            />
          ))}
        </div>
      </div>

      {/* Divider */}
      <div
        style={{
          width: '1px',
          height: '32px',
          background: '#dee2e6',
        }}
      />

      {/* Opacity Slider - only visible when compare is enabled */}
      {compareSettings.enabled && hasReferenceImage && (
        <div style={sectionStyle}>
          <span style={labelStyle}>透明度:</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                width: '100px',
                cursor: 'pointer',
              }}
            />
            <span style={{ fontSize: '12px', color: '#495057', minWidth: '36px' }}>
              {Math.round(compareSettings.opacity * 100)}%
            </span>
          </div>
        </div>
      )}

      {/* Pen Size (Quick Access) - with selection highlight */}
      <div style={sectionStyle}>
        <span style={labelStyle}>ペン太さ:</span>
        <div style={{ display: 'flex', gap: '6px' }}>
          {PEN_SIZES.map((size) => {
            const isSelected = selectedPenSize === size;
            return (
              <button
                key={size}
                onClick={() => handlePenSizeClick(size)}
                style={{
                  width: '36px',
                  height: '36px',
                  border: isSelected ? '3px solid #4a90d9' : '2px solid #ced4da',
                  borderRadius: '50%',
                  background: isSelected ? '#e3f2fd' : '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                  touchAction: 'manipulation',
                  transition: 'all 0.2s',
                  boxShadow: isSelected ? '0 0 0 2px #4a90d9' : 'none',
                }}
                aria-label={`ペン太さ ${size}px`}
              >
                <div
                  style={{
                    width: size,
                    height: size,
                    borderRadius: '50%',
                    background: isSelected ? '#4a90d9' : '#333',
                    transition: 'background 0.2s',
                  }}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
