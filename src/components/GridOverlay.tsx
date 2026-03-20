import { GRID_COLORS } from '../types';
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

  const { multiplier, colorKey } = settings;
  const color = GRID_COLORS[colorKey];
  
  // Base 4x5 grid scaled by multiplier
  const baseX = 4;
  const baseY = 5;
  const divisionsX = baseX * multiplier;
  const divisionsY = baseY * multiplier;
  
  // Calculate main grid lines (solid)
  const verticalLines = [];
  const horizontalLines = [];
  
  // Calculate sub grid lines (dashed)
  const subDivisionsX = divisionsX * 2;
  const subDivisionsY = divisionsY * 2;
  const subVerticalLines = [];
  const subHorizontalLines = [];
  
  // Main vertical lines (X divisions)
  for (let i = 1; i < divisionsX; i++) {
    const x = (width / divisionsX) * i;
    
    verticalLines.push(
      <line
        key={`v-${i}`}
        x1={x}
        y1={0}
        x2={x}
        y2={height}
        stroke={color}
        strokeWidth={2}
      />
    );
  }
  
  // Main horizontal lines (Y divisions)
  for (let i = 1; i < divisionsY; i++) {
    const y = (height / divisionsY) * i;
    
    horizontalLines.push(
      <line
        key={`h-${i}`}
        x1={0}
        y1={y}
        x2={width}
        y2={y}
        stroke={color}
        strokeWidth={2}
      />
    );
  }
  
  // Sub vertical lines
  for (let i = 1; i < subDivisionsX; i++) {
    if (i % 2 === 0) continue;
    
    const x = (width / subDivisionsX) * i;
    
    subVerticalLines.push(
      <line
        key={`sv-${i}`}
        x1={x}
        y1={0}
        x2={x}
        y2={height}
        stroke={color}
        strokeWidth={2.5}
        strokeDasharray="4,4"
        opacity={0.6}
      />
    );
  }
  
  // Sub horizontal lines
  for (let i = 1; i < subDivisionsY; i++) {
    if (i % 2 === 0) continue;
    
    const y = (height / subDivisionsY) * i;
    
    subHorizontalLines.push(
      <line
        key={`sh-${i}`}
        x1={0}
        y1={y}
        x2={width}
        y2={y}
        stroke={color}
        strokeWidth={2.5}
        strokeDasharray="4,4"
        opacity={0.6}
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
        strokeWidth={3}
      />
      
      {/* Sub grid lines (dashed, behind main lines) */}
      {subVerticalLines}
      {subHorizontalLines}
      
      {/* Main grid lines (solid) */}
      {verticalLines}
      {horizontalLines}
    </svg>
  );
};
