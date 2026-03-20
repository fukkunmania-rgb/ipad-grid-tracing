import { useState, useCallback, useRef, useEffect } from 'react';
import { Toolbar } from './components/Toolbar';
import { ReferencePane } from './components/ReferencePane';
import { CanvasPane } from './components/CanvasPane';
import { SettingsPanel } from './components/SettingsPanel';
import type { Tool, GridSettings, CompareSettings, ImageTransform } from './types';
import './App.css';

// Fixed canvas size - maximum size with minimal margins
const FIXED_CANVAS_WIDTH = 640;
const FIXED_CANVAS_HEIGHT = 800; // 4:5 ratio

function App() {
  // Image state
  const [referenceImage, setReferenceImage] = useState<string | null>(null);

  // Tool state
  const [currentTool, setCurrentTool] = useState<Tool>('pen');
  const [penColor] = useState('#000000');
  const [penSize, setPenSize] = useState(4);
  const [eraserSize] = useState(20);

  // Grid settings - 4x5 grid base with multiplier
  const [gridSettings, setGridSettings] = useState<GridSettings>({
    enabled: true,
    multiplier: 1, // 1=4x5, 2=8x10, 3=12x15, 4=16x20
    colorKey: 'red',
  });

  // Compare settings
  const [compareSettings, setCompareSettings] = useState<CompareSettings>({
    enabled: false,
    opacity: 0.5,
  });

  // Grayscale state - shared between reference and compare overlay
  const [isGrayscale, setIsGrayscale] = useState(false);

  // Image transform state (for reference pane)
  const [imageTransform, setImageTransform] = useState<ImageTransform>({
    scale: 1,
    rotation: 0,
    translateX: 0,
    translateY: 0,
  });

  // Lock state - manual control for reference position editing
  const [isPositionLocked, setIsPositionLocked] = useState(false);

  // Toggle lock function
  const togglePositionLock = useCallback(() => {
    setIsPositionLocked(prev => !prev);
  }, []);

  // Undo/Redo state from canvas
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Trigger flags for undo/redo/clear
  const [undoTrigger, setUndoTrigger] = useState(false);
  const [redoTrigger, setRedoTrigger] = useState(false);
  const [clearTrigger, setClearTrigger] = useState(false);

  // Export function reference
  const exportFnRef = useRef<(() => string | null) | null>(null);

  // Canvas container size - fixed size regardless of grid multiplier
  const [canvasSize, setCanvasSize] = useState({
    width: FIXED_CANVAS_WIDTH,
    height: FIXED_CANVAS_HEIGHT,
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

  // Disable selection on iPad/Apple Pencil - 徹底版
  useEffect(() => {
    const preventDefault = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };
    
    // 選択範囲を強制クリアする関数
    const clearSelection = () => {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        selection.removeAllRanges();
      }
      // iOS Safari対策：document.bodyをblur
      if (document.activeElement && document.activeElement !== document.body) {
        (document.activeElement as HTMLElement).blur();
      }
    };
    
    // Prevent various selection triggers
    document.addEventListener('selectstart', preventDefault, { capture: true });
    document.addEventListener('selectionchange', (e) => {
      clearSelection();
      preventDefault(e);
    }, { capture: true });
    
    // iOSコンテキストメニュー（コピーUI）抑制
    document.addEventListener('contextmenu', preventDefault, { capture: true });
    
    // Prevent iPad specific gestures
    document.addEventListener('gesturestart', preventDefault, { capture: true });
    document.addEventListener('gesturechange', preventDefault, { capture: true });
    document.addEventListener('gestureend', preventDefault, { capture: true });
    
    // iOS長押しメニュー（callout）を完全に無効化
    const handleTouchStart = (e: TouchEvent) => {
      // 長押しによる選択を防ぐ
      clearSelection();
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };
    
    const handleTouchEnd = () => {
      // タッチ終了時も選択をクリア
      clearSelection();
    };
    
    // @ts-ignore - GitHub ActionsのTypeScriptバージョン互換性のため
    document.addEventListener('touchstart', handleTouchStart, { passive: false, capture: true });
    // @ts-ignore
    document.addEventListener('touchend', handleTouchEnd, { passive: false, capture: true });
    
    // 定期的に選択をクリア（iOSの予防的選択対策）
    const intervalId = setInterval(clearSelection, 100);
    
    return () => {
      document.removeEventListener('selectstart', preventDefault, { capture: true });
      document.removeEventListener('selectionchange', preventDefault, { capture: true });
      document.removeEventListener('contextmenu', preventDefault, { capture: true });
      document.removeEventListener('gesturestart', preventDefault, { capture: true });
      document.removeEventListener('gesturechange', preventDefault, { capture: true });
      document.removeEventListener('gestureend', preventDefault, { capture: true });
      // @ts-ignore
      document.removeEventListener('touchstart', handleTouchStart, { passive: false, capture: true });
      // @ts-ignore
      document.removeEventListener('touchend', handleTouchEnd, { passive: false, capture: true });
      clearInterval(intervalId);
    };
  }, []);

  // Adjust canvas size based on viewport - fixed size regardless of grid multiplier
  useEffect(() => {
    const updateSize = () => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // Minimize reserved space - almost no margins
      const availableHeight = viewportHeight - 50; // minimal toolbar+settings height
      const paneWidth = (viewportWidth / 2) - 4; // 4px total padding (2px each side)
      
      // Calculate max size that fits in available space (maintaining 4:5 ratio)
      let width = Math.min(paneWidth, FIXED_CANVAS_WIDTH);
      let height = width * 5 / 4;
      
      if (height > availableHeight) {
        height = Math.min(availableHeight, FIXED_CANVAS_HEIGHT);
        width = height * 4 / 5;
      }
      
      // Canvas size is fixed - doesn't change with grid multiplier
      setCanvasSize({
        width: Math.floor(width),
        height: Math.floor(height),
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
        compareSettings={compareSettings}
        onCompareSettingsChange={setCompareSettings}
        hasReferenceImage={!!referenceImage}
      />

      {/* Settings Panel - Moved to top to avoid home bar interference */}
      <SettingsPanel
        gridSettings={gridSettings}
        onGridSettingsChange={setGridSettings}
        compareSettings={compareSettings}
        onCompareSettingsChange={setCompareSettings}
        hasReferenceImage={!!referenceImage}
        currentPenSize={penSize}
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
          isGrayscale={isGrayscale}
          onGrayscaleChange={setIsGrayscale}
          transform={imageTransform}
          onTransformChange={setImageTransform}
          isLocked={isPositionLocked}
          onLockToggle={togglePositionLock}
        />

        <CanvasPane
          referenceImage={referenceImage}
          currentTool={currentTool}
          penColor={penColor}
          penSize={penSize}
          eraserSize={eraserSize}
          gridSettings={gridSettings}
          compareSettings={compareSettings}
          isGrayscale={isGrayscale}
          imageTransform={imageTransform}
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

    </div>
  );
}

export default App;
