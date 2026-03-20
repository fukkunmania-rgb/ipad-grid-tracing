export type Tool = 'pen' | 'eraser';

export type GridColor = 'red' | 'black' | 'blue' | 'green';

export const GRID_COLORS: Record<GridColor, string> = {
  red: 'rgba(255, 0, 0, 0.4)',
  black: 'rgba(0, 0, 0, 0.5)',
  blue: 'rgba(0, 100, 255, 0.4)',
  green: 'rgba(0, 150, 0, 0.4)',
};

export interface GridSettings {
  enabled: boolean;
  // Base is 4x5 grid, multiplier scales it (1=4x5, 2=8x10, etc.)
  multiplier: 1 | 2 | 3 | 4;
  colorKey: GridColor;
}

export interface CompareSettings {
  enabled: boolean;
  opacity: number;
}

export interface ImageTransform {
  scale: number;
  rotation: number;
  translateX: number;
  translateY: number;
}

export interface Point {
  x: number;
  y: number;
  pressure?: number;
}

export interface Stroke {
  points: Point[];
  tool: Tool;
  color: string;
  size: number;
}

export interface CanvasState {
  referenceImage: string | null;
  currentTool: Tool;
  penColor: string;
  penSize: number;
  eraserSize: number;
  grid: GridSettings;
  compare: CompareSettings;
}

// Custom events for SettingsPanel -> App communication
declare global {
  interface WindowEventMap {
    'penSizeChange': CustomEvent<number>;
  }
}

// Export empty object to make this a module
export {};
