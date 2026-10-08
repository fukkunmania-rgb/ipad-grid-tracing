// Document coordinates never depend on the viewport or devicePixelRatio.
export const PAPER_WIDTH = 640;
export const PAPER_HEIGHT = 800;
export const EXPORT_HEIGHT = 720;
export const EXPORT_WIDTH = EXPORT_HEIGHT * PAPER_WIDTH / PAPER_HEIGHT;

export type Tool = 'pen' | 'eraser';
export type GridColor = 'red' | 'black' | 'blue' | 'green';
export const GRID_COLORS: Record<GridColor, string> = {
  red: '#d53939', black: '#292929', blue: '#2869ba', green: '#287b43',
};
export interface GridSettings {
  enabled: boolean;
  multiplier: 1 | 2;
  colorKey: GridColor;
  lineWidth: number;
}
export interface CompareSettings { enabled: boolean; opacity: number }
export interface ImageTransform {
  scale: number;
  rotation: number;
  translateX: number;
  translateY: number;
}
export interface Point { x: number; y: number }
export interface Stroke {
  points: Point[];
  tool: Tool;
  color: string;
  size: number;
}
export interface ReferenceAsset {
  blob: Blob;
  name: string;
  width: number;
  height: number;
}
export type ExportBackground = 'white' | 'transparent';
export interface Session {
  version: 1;
  strokes: Stroke[];
  reference: ReferenceAsset | null;
  transform: ImageTransform;
  locked: boolean;
  grayscale: boolean;
  grid: GridSettings;
  compare: CompareSettings;
  tool: Tool;
  penSize: number;
  eraserSize: number;
  exportBackground: ExportBackground;
}
export interface HistoryStatus { canUndo: boolean; canRedo: boolean }
export interface CanvasHandle {
  undo(): void;
  redo(): void;
  clear(): void;
  reset(): void;
  finish(): void;
  exportPNG(background: ExportBackground): Promise<Blob>;
}
