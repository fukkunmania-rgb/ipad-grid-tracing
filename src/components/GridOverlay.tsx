import { memo } from 'react';
import { GRID_COLORS } from '../types';
import type { GridSettings } from '../types';

interface Props { width: number; height: number; settings: GridSettings }
export const GridOverlay = memo(function GridOverlay({ width, height, settings }: Props) {
  if (!settings.enabled) return null;
  const columns = 4 * settings.multiplier, rows = 5 * settings.multiplier;
  const color = GRID_COLORS[settings.colorKey];
  const lines = [];
  // Sub-grid lines are always present whenever the grid is enabled.
  for (let i = 1; i < columns * 2; i++) {
    const sub = i % 2 !== 0;
    lines.push(<line key={`v${i}`} data-subgrid={sub || undefined}
      x1={width * i / (columns * 2)} x2={width * i / (columns * 2)} y1={0} y2={height}
      strokeWidth={settings.lineWidth * (sub ? 0.65 : 1)} opacity={sub ? 0.42 : 0.65}
      strokeDasharray={sub ? '3 3' : undefined} />);
  }
  for (let i = 1; i < rows * 2; i++) {
    const sub = i % 2 !== 0;
    lines.push(<line key={`h${i}`} data-subgrid={sub || undefined}
      x1={0} x2={width} y1={height * i / (rows * 2)} y2={height * i / (rows * 2)}
      strokeWidth={settings.lineWidth * (sub ? 0.65 : 1)} opacity={sub ? 0.42 : 0.65}
      strokeDasharray={sub ? '3 3' : undefined} />);
  }
  return <svg className="grid-overlay" width={width} height={height} aria-hidden="true" stroke={color}>
    {lines}
    <rect x={0.5} y={0.5} width={Math.max(0, width - 1)} height={Math.max(0, height - 1)}
      fill="none" strokeWidth={settings.lineWidth} opacity={0.7} />
  </svg>;
});
