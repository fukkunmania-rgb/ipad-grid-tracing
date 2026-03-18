import { useRef, useEffect } from 'react';
import { GridOverlay } from './GridOverlay';
import { useCanvas } from '../hooks/useCanvas';
import type { Tool, GridSettings, CompareSettings } from '../types';

interface CanvasPaneProps {
  referenceImage: string | null;
  currentTool: Tool;
  penColor: string;
  penSize: number;
  eraserSize: number;
  gridSettings: GridSettings;
  compareSettings: CompareSettings;
  containerWidth: number;
  containerHeight: number;
  onUndoAvailable: (canUndo: boolean) => void;
  onRedoAvailable: (canRedo: boolean) => void;
  triggerUndo: boolean;
  triggerRedo: boolean;
  triggerClear: boolean;
  onExportReady: (exportFn: () => string | null) => void;
}

export const CanvasPane: React.FC<CanvasPaneProps> = ({
  referenceImage,
  currentTool,
  penColor,
  penSize,
  eraserSize,
  gridSettings,
  compareSettings,
  containerWidth,
  containerHeight,
  onUndoAvailable,
  onRedoAvailable,
  triggerUndo,
  triggerRedo,
  triggerClear,
  onExportReady,
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const {
    canvasRef,
    startDrawing,
    draw,
    stopDrawing,
    undo,
    redo,
    clear,
    canUndo,
    canRedo,
    exportPNG,
  } = useCanvas(
    containerWidth,
    containerHeight,
    currentTool,
    penColor,
    penSize,
    eraserSize
  );

  // Track undo/redo availability
  useEffect(() => {
    onUndoAvailable(canUndo);
  }, [canUndo, onUndoAvailable]);

  useEffect(() => {
    onRedoAvailable(canRedo);
  }, [canRedo, onRedoAvailable]);

  // Handle trigger props from parent
  useEffect(() => {
    if (triggerUndo) undo();
  }, [triggerUndo, undo]);

  useEffect(() => {
    if (triggerRedo) redo();
  }, [triggerRedo, redo]);

  useEffect(() => {
    if (triggerClear) clear();
  }, [triggerClear, clear]);

  // Export function registration
  useEffect(() => {
    onExportReady(exportPNG);
  }, [exportPNG, onExportReady]);

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: '#fff',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '8px 12px',
          background: '#e9ecef',
          borderBottom: '1px solid #dee2e6',
          fontWeight: 'bold',
          fontSize: '14px',
          color: '#495057',
        }}
      >
        描画キャンバス
      </div>

      <div
        ref={wrapperRef}
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          position: 'relative',
          background: '#f8f9fa',
          overflow: 'auto',
        }}
      >
        <div
          style={{
            position: 'relative',
            width: containerWidth,
            height: containerHeight,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            background: '#fff',
          }}
        >
          {/* Drawing Canvas */}
          <canvas
            ref={canvasRef}
            onPointerDown={startDrawing}
            onPointerMove={draw}
            onPointerUp={stopDrawing}
            onPointerCancel={stopDrawing}
            onPointerLeave={stopDrawing}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              touchAction: 'none', // Prevent scrolling while drawing
              cursor: currentTool === 'pen' ? 'crosshair' : 'cell',
              zIndex: 1,
            }}
          />

          {/* Compare Overlay */}
          {compareSettings.enabled && referenceImage && (
            <img
              src={referenceImage}
              alt="Compare"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                opacity: compareSettings.opacity,
                pointerEvents: 'none',
                zIndex: 5,
              }}
              draggable={false}
            />
          )}

          {/* Grid Overlay */}
          <GridOverlay
            width={containerWidth}
            height={containerHeight}
            settings={gridSettings}
            className="canvas-grid"
          />
        </div>
      </div>

      {/* Tool indicator */}
      <div
        style={{
          padding: '8px 12px',
          background: '#e9ecef',
          borderTop: '1px solid #dee2e6',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '12px',
          color: '#6c757d',
        }}
      >
        <span>
          ツール: {currentTool === 'pen' ? 'ペン' : '消しゴム'} | 
          サイズ: {currentTool === 'pen' ? penSize : eraserSize}px
        </span>
        {compareSettings.enabled && (
          <span style={{ color: '#4a90d9' }}>
            比較モード ON ({Math.round(compareSettings.opacity * 100)}%)
          </span>
        )}
      </div>
    </div>
  );
};
