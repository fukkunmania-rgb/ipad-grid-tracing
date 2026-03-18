export type Tool = 'pen' | 'eraser';

export interface GridSettings {
  enabled: boolean;
  divisions: 2 | 4 | 6 | 8;
  color: string;
}

export interface CompareSettings {
  enabled: boolean;
  opacity: number;
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
