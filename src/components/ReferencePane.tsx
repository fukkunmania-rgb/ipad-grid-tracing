import { useRef, useState, useCallback, useEffect } from 'react';
import { GridOverlay } from './GridOverlay';
import type { GridSettings, ImageTransform } from '../types';

interface ReferencePaneProps {
  image: string | null;
  onImageLoad: (imageUrl: string) => void;
  gridSettings: GridSettings;
  containerWidth: number;
  containerHeight: number;
  isGrayscale: boolean;
  onGrayscaleChange: (grayscale: boolean) => void;
  transform: ImageTransform;
  onTransformChange: (transform: ImageTransform) => void;
  isLocked: boolean;
  onLockToggle: () => void;
}

const DEFAULT_TRANSFORM: ImageTransform = {
  scale: 1,
  rotation: 0,
  translateX: 0,
  translateY: 0,
};

export const ReferencePane: React.FC<ReferencePaneProps> = ({
  image,
  onImageLoad,
  gridSettings,
  containerWidth,
  containerHeight,
  isGrayscale,
  onGrayscaleChange,
  transform,
  onTransformChange,
  isLocked,
  onLockToggle,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  
  // Use state for active pointers to ensure reactivity
  const [activePointers, setActivePointers] = useState<Map<number, { x: number; y: number }>>(new Map());
  const gestureRef = useRef<{
    isActive: boolean;
    startTransform: ImageTransform;
    startDistance: number;
    startAngle: number;
    startCenter: { x: number; y: number };
  } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('画像ファイルを選択してください');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        const img = new Image();
        img.onload = () => {
          setImageSize({ width: img.width, height: img.height });
          onImageLoad(result);
          onTransformChange(DEFAULT_TRANSFORM);
        };
        img.src = result;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          const img = new Image();
          img.onload = () => {
            setImageSize({ width: img.width, height: img.height });
            onImageLoad(result);
            onTransformChange(DEFAULT_TRANSFORM);
          };
          img.src = result;
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleReset = () => {
    onTransformChange(DEFAULT_TRANSFORM);
  };

  // Get distance between two points
  const getDistance = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  };

  // Get angle between two points in degrees
  const getAngle = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
    return (Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180) / Math.PI;
  };

  // Get center point between two points
  const getCenter = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
    return {
      x: (p1.x + p2.x) / 2,
      y: (p1.y + p2.y) / 2,
    };
  };

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (isLocked || !image) return;
    
    const container = containerRef.current;
    if (!container) return;

    // Get coordinates relative to container
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Add new pointer
    setActivePointers(prev => {
      const newMap = new Map(prev);
      newMap.set(e.pointerId, { x, y });
      
      // If this is the second pointer, start gesture
      if (newMap.size === 2) {
        const points = Array.from(newMap.values());
        const p1 = points[0];
        const p2 = points[1];
        
        gestureRef.current = {
          isActive: true,
          startTransform: { ...transform },
          startDistance: getDistance(p1, p2),
          startAngle: getAngle(p1, p2),
          startCenter: getCenter(p1, p2),
        };
      }
      
      return newMap;
    });
  }, [isLocked, image, transform]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!gestureRef.current?.isActive) return;
    
    const container = containerRef.current;
    if (!container) return;

    // Update pointer position
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setActivePointers(prev => {
      const newMap = new Map(prev);
      newMap.set(e.pointerId, { x, y });
      
      // Only process if we have exactly 2 pointers
      if (newMap.size === 2 && gestureRef.current?.isActive) {
        const points = Array.from(newMap.values());
        const p1 = points[0];
        const p2 = points[1];
        
        const currentDistance = getDistance(p1, p2);
        const currentAngle = getAngle(p1, p2);
        const currentCenter = getCenter(p1, p2);
        
        const { startDistance, startAngle, startCenter, startTransform } = gestureRef.current;
        
        // Calculate scale
        const scaleDelta = currentDistance / startDistance;
        const newScale = Math.max(0.3, Math.min(5, startTransform.scale * scaleDelta));
        
        // Calculate rotation
        const rotationDelta = currentAngle - startAngle;
        const newRotation = startTransform.rotation + rotationDelta;
        
        // Calculate pan
        const panDeltaX = currentCenter.x - startCenter.x;
        const panDeltaY = currentCenter.y - startCenter.y;
        
        const newTranslateX = startTransform.translateX + panDeltaX;
        const newTranslateY = startTransform.translateY + panDeltaY;
        
        // Apply transform immediately
        onTransformChange({
          scale: newScale,
          rotation: newRotation,
          translateX: newTranslateX,
          translateY: newTranslateY,
        });
      }
      
      return newMap;
    });
  }, [onTransformChange]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    setActivePointers(prev => {
      const newMap = new Map(prev);
      newMap.delete(e.pointerId);
      
      if (newMap.size < 2) {
        gestureRef.current = null;
      }
      
      return newMap;
    });
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      gestureRef.current = null;
    };
  }, []);

  const displaySize = { width: containerWidth, height: containerHeight };
  const transformStyle = `translate(${transform.translateX}px, ${transform.translateY}px) rotate(${transform.rotation}deg) scale(${transform.scale})`;
  const isGesturing = activePointers.size >= 2;

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: '#f0f0f0',
        borderRight: '2px solid #ccc',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '8px 12px',
          background: '#e9ecef',
          borderBottom: '1px solid #dee2e6',
          fontWeight: 'bold',
          fontSize: '14px',
          color: '#495057',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>参考画像</span>
          {image && (
            <button
              onClick={() => onGrayscaleChange(!isGrayscale)}
              style={{
                padding: '4px 12px',
                fontSize: '12px',
                background: isGrayscale ? '#495057' : '#fff',
                color: isGrayscale ? '#fff' : '#495057',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {isGrayscale ? '白黒' : 'カラー'}
            </button>
          )}
        </div>
        {image && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {isLocked && (
              <span style={{ fontSize: '12px', color: '#856404', whiteSpace: 'nowrap' }}>
                位置調整不可
              </span>
            )}
            <button
              onClick={onLockToggle}
              style={{
                padding: '4px 12px',
                fontSize: '12px',
                background: isLocked ? '#ffc107' : '#28a745',
                color: isLocked ? '#000' : '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {isLocked ? 'ロック中' : '編集可能'}
            </button>
            <button
              onClick={handleReset}
              disabled={isLocked}
              style={{
                padding: '4px 12px',
                fontSize: '12px',
                background: isLocked ? '#adb5bd' : '#dc3545',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: isLocked ? 'not-allowed' : 'pointer',
                WebkitTapHighlightColor: 'transparent',
                opacity: isLocked ? 0.6 : 1,
              }}
            >
              リセット
            </button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          position: 'relative',
          overflow: 'hidden',
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none',
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onContextMenu={(e: React.MouseEvent) => e.preventDefault()}
      >
        {/* Gesture hint - absolute positioned to avoid layout shift */}
        {image && !isLocked && (
          <div
            style={{
              position: 'absolute',
              top: '8px',
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '6px 16px',
              background: 'rgba(227, 242, 253, 0.95)',
              border: '1px solid #bbdefb',
              borderRadius: '4px',
              fontSize: '12px',
              color: '#1976d2',
              textAlign: 'center',
              zIndex: 20,
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            {isGesturing ? 'ジェスチャー中...' : '2本指でピンチ・回転・ドラッグ'}
          </div>
        )}
        {image ? (
          <div
            style={{
              position: 'relative',
              width: displaySize.width,
              height: displaySize.height,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              background: '#fff',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                transform: transformStyle,
                transformOrigin: 'center center',
                willChange: 'transform',
              }}
            >
              <img
                src={image}
                alt="Reference"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  display: 'block',
                  filter: isGrayscale ? 'grayscale(100%)' : 'none',
                  pointerEvents: 'none',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  WebkitTouchCallout: 'none',

                }}
                draggable={false}
              />
            </div>
            <GridOverlay
              width={displaySize.width}
              height={displaySize.height}
              settings={gridSettings}
            />
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px',
              border: '3px dashed #adb5bd',
              borderRadius: '12px',
              color: '#6c757d',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>画像</div>
            <div style={{ fontSize: '16px', marginBottom: '8px' }}>
              画像をドラッグ＆ドロップ
            </div>
            <div style={{ fontSize: '14px', marginBottom: '16px' }}>または</div>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                background: '#4a90d9',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              ファイルを選択
            </button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      </div>

      {/* Footer */}
      {image && (
        <div
          style={{
            padding: '6px 12px 24px 12px',
            background: '#e9ecef',
            borderTop: '1px solid #dee2e6',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: '12px', color: '#6c757d' }}>
            {imageSize.width} x {imageSize.height}px
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: '#6c757d' }}>
              {transform.scale.toFixed(1)}x | {Math.round(transform.rotation)}°
            </span>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                background: '#6c757d',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              変更
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
