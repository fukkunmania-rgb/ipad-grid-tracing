import React, { useRef, useState } from 'react';
import { GridOverlay } from './GridOverlay';
import type { GridSettings } from '../types';

interface ReferencePaneProps {
  image: string | null;
  onImageLoad: (imageUrl: string) => void;
  gridSettings: GridSettings;
  containerWidth: number;
  containerHeight: number;
}

export const ReferencePane: React.FC<ReferencePaneProps> = ({
  image,
  onImageLoad,
  gridSettings,
  containerWidth,
  containerHeight,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

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
        // Get image dimensions
        const img = new Image();
        img.onload = () => {
          setImageSize({ width: img.width, height: img.height });
          onImageLoad(result);
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

  // Calculate display size to fit in container while maintaining aspect ratio
  const getDisplaySize = () => {
    if (!image || imageSize.width === 0) {
      return { width: containerWidth, height: containerHeight };
    }

    const aspectRatio = imageSize.width / imageSize.height;
    const containerAspect = containerWidth / containerHeight;

    let width, height;
    if (aspectRatio > containerAspect) {
      width = containerWidth;
      height = containerWidth / aspectRatio;
    } else {
      height = containerHeight;
      width = containerHeight * aspectRatio;
    }

    return { width, height };
  };

  const displaySize = getDisplaySize();

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
        参考画像
      </div>

      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          position: 'relative',
          overflow: 'auto',
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {image ? (
          <div
            style={{
              position: 'relative',
              width: displaySize.width,
              height: displaySize.height,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
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
                background: '#fff',
              }}
              draggable={false}
            />
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
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🖼️</div>
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
                WebkitTapHighlightColor: 'transparent',
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

      {image && (
        <div
          style={{
            padding: '8px 12px',
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
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            変更
          </button>
        </div>
      )}
    </div>
  );
};
