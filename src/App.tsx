import { useState, useCallback, useRef, useEffect } from 'react';
import { Toolbar } from './components/Toolbar';
import { ReferencePane } from './components/ReferencePane';
import { CanvasPane } from './components/CanvasPane';
import { SettingsPanel } from './components/SettingsPanel';
import type { Tool, GridSettings, CompareSettings } from './types';
import './App.css';

// Default sizes for iPad landscape
const DEFAULT_CANVAS_WIDTH = 500;
const DEFAULT_CANVAS_HEIGHT = 600;

function App() {
  // Image state
  const [referenceImage, setReferenceImage] = useState<string | null>(null);

  // Tool state
  const [currentTool, setCurrentTool] = useState<Tool>('pen');
  const [penColor] = useState('#000000');
  const [penSize, setPenSize] = useState(4);
  const [eraserSize] = useState(20);

  // Grid settings
  const [gridSettings, setGridSettings] = useState<GridSettings>({
    enabled: true,
    divisions: 4,
    color: 'rgba(255, 0, 0, 0.4)',
  });

  // Compare settings
  const [compareSettings, setCompareSettings] = useState<CompareSettings>({
    enabled: false,
    opacity: 0.5,
  });

  // Undo/Redo state from canvas
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Trigger flags for undo/redo/clear
  const [undoTrigger, setUndoTrigger] = useState(false);
  const [redoTrigger, setRedoTrigger] = useState(false);
  const [clearTrigger, setClearTrigger] = useState(false);

  // Export function reference
  const exportFnRef = useRef<(() => string | null) | null>(null);

  // Canvas container size
  const [canvasSize, setCanvasSize] = useState({
    width: DEFAULT_CANVAS_WIDTH,
    height: DEFAULT_CANVAS_HEIGHT,
  });

  // Listen for pen size changes from settings panel
  useEffect(() => {
    const handlePenSizeChange = (e: CustomEvent<number>) => {
      setPenSize(e.detail);
    };
    window.addEventListener('penSizeChange', handlePenSizeChange as EventListener);
    return () => {
      window.removeEventListener('penSizeChange', handlePenSizeChange as EventListener);
    };
  }, []);

  // Adjust canvas size based on viewport
  useEffect(() => {
    const updateSize = () => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // Reserve space for toolbar (60px) and settings panel (80px)
      const availableHeight = viewportHeight - 140;
      const paneWidth = (viewportWidth / 2) - 48; // 48px for padding
      
      setCanvasSize({
        width: Math.min(paneWidth, 600),
        height: Math.min(availableHeight, 700),
      });
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Toolbar handlers
  const handleUndo = useCallback(() => {
    setUndoTrigger((prev) => !prev);
  }, []);

  const handleRedo = useCallback(() => {
    setRedoTrigger((prev) => !prev);
  }, []);

  const handleClear = useCallback(() => {
    if (confirm('描画内容をすべて削除しますか？')) {
      setClearTrigger((prev) => !prev);
    }
  }, []);

  const handleExport = useCallback(() => {
    if (exportFnRef.current) {
      const dataUrl = exportFnRef.current();
      if (dataUrl) {
        const link = document.createElement('a');
        link.download = `tracing-${new Date().toISOString().slice(0, 10)}.png`;
        link.href = dataUrl;
        link.click();
      }
    }
  }, []);

  const handleExportReady = useCallback((fn: () => string | null) => {
    exportFnRef.current = fn;
  }, []);

  return (
    <div
      className="app"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
        touchAction: 'none', // Prevent browser zoom/pan
      }}
    >
      {/* Toolbar */}
      <Toolbar
        currentTool={currentTool}
        onToolChange={setCurrentTool}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClear={handleClear}
        canUndo={canUndo}
        canRedo={canRedo}
        onExport={handleExport}
      />

      {/* Main Workspace */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
        }}
      >
        <ReferencePane
          image={referenceImage}
          onImageLoad={setReferenceImage}
          gridSettings={gridSettings}
          containerWidth={canvasSize.width}
          containerHeight={canvasSize.height}
        />

        <CanvasPane
          referenceImage={referenceImage}
          currentTool={currentTool}
          penColor={penColor}
          penSize={penSize}
          eraserSize={eraserSize}
          gridSettings={gridSettings}
          compareSettings={compareSettings}
          containerWidth={canvasSize.width}
          containerHeight={canvasSize.height}
          onUndoAvailable={setCanUndo}
          onRedoAvailable={setCanRedo}
          triggerUndo={undoTrigger}
          triggerRedo={redoTrigger}
          triggerClear={clearTrigger}
          onExportReady={handleExportReady}
        />
      </div>

      {/* Settings Panel */}
      <SettingsPanel
        gridSettings={gridSettings}
        onGridSettingsChange={setGridSettings}
        compareSettings={compareSettings}
        onCompareSettingsChange={setCompareSettings}
        hasReferenceImage={!!referenceImage}
      />
    </div>
  );
}

export default App;
