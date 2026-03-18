import React from 'react';
import type { GridSettings } from '../types';

interface GridOverlayProps {
  width: number;
  height: number;
  settings: GridSettings;
  className?: string;
}

export const GridOverlay: React.FC<GridOverlayProps> = ({
  width,
  height,
  settings,
  className = '',
}) => {
  if (!settings.enabled) return null;

  const { divisions, color } = settings;
  
  // Calculate grid lines
  const verticalLines = [];
  const horizontalLines = [];
  
  for (let i = 1; i < divisions; i++) {
    const x = (width / divisions) * i;
    const y = (height / divisions) * i;
    
    verticalLines.push(
      <line
        key={`v-${i}`}
        x1={x}
        y1={0}
        x2={x}
        y2={height}
        stroke={color}
        strokeWidth={1}
      />
    );
    
    horizontalLines.push(
      <line
        key={`h-${i}`}
        x1={0}
        y1={y}
        x2={width}
        y2={y}
        stroke={color}
        strokeWidth={1}
      />
    );
  }

  return (
    <svg
      className={`grid-overlay ${className}`}
      width={width}
      height={height}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        zIndex: 10,
      }}
    >
      {/* Border */}
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill="none"
        stroke={color}
        strokeWidth={2}
      />
      {verticalLines}
      {horizontalLines}
    </svg>
  );
};
