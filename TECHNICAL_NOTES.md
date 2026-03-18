# iPad Safari / Apple Pencil対応技術メモ

## 5. iPad Safari / Apple Pencil対応での注意点

### Pointer Events API

Apple PencilはPointer Events APIで検出できます。主なポイント：

```typescript
// ReactのSyntheticEventではなく、ネイティブイベントプロパティを活用
const pressure = e.pressure; // 0.0 ~ 1.0 (Apple Pencil)
const pointerType = e.pointerType; // 'pen', 'touch', 'mouse'
```

**重要なプロパティ：**
- `e.pressure`: 筆圧（Apple Pencil対応）
- `e.pointerType`: 'pen' はApple Pencil
- `e.tangentialPressure`: バレル圧力（対応デバイス）
- `e.tiltX`, `e.tiltY`: ペンの傾き（対応デバイス）

### Retina対応（高DPI）

iPadは高DPIディスプレイ（Retina）を使用。ぼやけない描画には：

```typescript
const dpr = window.devicePixelRatio || 1;
canvas.width = displayWidth * dpr;
canvas.height = displayHeight * dpr;
canvas.style.width = `${displayWidth}px`;
canvas.style.height = `${displayHeight}px`;
ctx.scale(dpr, dpr);
```

### タッチ・ジェスチャー防止

描画中のブラウザジェスチャーを防止：

```css
canvas {
  touch-action: none; /* スクロール・ズーム・戻るジェスチャーを無効化 */
}
```

```typescript
// Pointer Eventsでもキャプチャ
canvas.setPointerCapture(e.pointerId);
```

### iPad Safari特有の問題

1. **ダブルタップズーム**
   ```html
   <meta name="viewport" content="..., user-scalable=no">
   ```

2. **エラスティックスクロール**
   ```css
   html {
     overscroll-behavior: none;
     -webkit-overscroll-behavior: none;
   }
   ```

3. **選択・コピー防止**
   ```css
   * {
     -webkit-user-select: none;
     user-select: none;
     -webkit-touch-callout: none;
   }
   ```

4. **メモリ制限**
   - iPad Safariは大きなCanvasに制限あり
   - 推奨最大サイズ：4096x4096ピクセル

5. **Apple Pencilの palm rejection**
   - Pointer Eventsは自動的に palm rejection を行う
   - 手のひらタッチは `touch` イベントとして検出される

### Canvas最適化

```typescript
const ctx = canvas.getContext('2d', {
  alpha: true,
  desynchronized: true, // 低遅延レンダリング
});
```

## 6. 後から拡張しやすい改善案

### レイヤー機能

```typescript
interface Layer {
  id: string;
  name: string;
  canvas: HTMLCanvasElement;
  visible: boolean;
  opacity: number;
}

// LayerManagerクラスで管理
class LayerManager {
  layers: Layer[];
  activeLayerId: string;
  
  addLayer(name: string): Layer;
  removeLayer(id: string): void;
  mergeLayer(sourceId: string, targetId: string): void;
  renderComposite(): ImageData;
}
```

### 位置調整機能（比較時）

```typescript
interface Transform {
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

// ピンチズーム・パン対応
const [transform, setTransform] = useState<Transform>({
  x: 0, y: 0, scale: 1, rotation: 0
});
```

### カラーパレット

```typescript
const PRESET_COLORS = [
  '#000000', // Black
  '#1a1a1a', // Dark Gray
  '#4a4a4a', // Gray
  '#dc3545', // Red
  '#fd7e14', // Orange
  '#ffc107', // Yellow
  '#28a745', // Green
  '#17a2b8', // Cyan
  '#4a90d9', // Blue
  '#6f42c1', // Purple
];
```

### ショートカットキー（外部キーボード対応）

```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey) {
      switch (e.key) {
        case 'z':
          e.preventDefault();
          e.shiftKey ? redo() : undo();
          break;
        case 's':
          e.preventDefault();
          exportPNG();
          break;
      }
    }
  };
  
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);
```

### LocalStorage自動保存

```typescript
const AUTO_SAVE_KEY = 'grid-tracing-auto-save';

// 定期的に保存
useEffect(() => {
  const interval = setInterval(() => {
    const dataUrl = canvas.toDataURL();
    localStorage.setItem(AUTO_SAVE_KEY, dataUrl);
    localStorage.setItem(`${AUTO_SAVE_KEY}-timestamp`, Date.now().toString());
  }, 30000); // 30秒ごと
  
  return () => clearInterval(interval);
}, []);

// 復元
useEffect(() => {
  const saved = localStorage.getItem(AUTO_SAVE_KEY);
  if (saved) {
    restoreFromDataUrl(saved);
  }
}, []);
```

### SVGエクスポート（ベクター出力）

```typescript
interface VectorStroke {
  points: Point[];
  tool: Tool;
  color: string;
  size: number;
}

const exportSVG = (strokes: VectorStroke[]): string => {
  const paths = strokes.map(stroke => {
    const d = stroke.points.map((p, i) => 
      i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`
    ).join(' ');
    
    return `<path d="${d}" stroke="${stroke.color}" stroke-width="${stroke.size}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  });
  
  return `<svg xmlns="http://www.w3.org/2000/svg">${paths.join('')}</svg>`;
};
```

### WebGLレンダリング（高パフォーマンス）

大量のストロークや大きなキャンバスでパフォーマンスが必要な場合：

```typescript
// paper.js や fabric.js の検討
// または自前のWebGLレンダラー
```

### ツールプリセット

```typescript
interface ToolPreset {
  name: string;
  tool: Tool;
  size: number;
  color: string;
  opacity: number;
}

const PRESETS: ToolPreset[] = [
  { name: 'ペン（細）', tool: 'pen', size: 2, color: '#000', opacity: 1 },
  { name: 'ペン（中）', tool: 'pen', size: 4, color: '#000', opacity: 1 },
  { name: 'ペン（太）', tool: 'pen', size: 8, color: '#000', opacity: 1 },
  { name: '消しゴム（小）', tool: 'eraser', size: 10, color: '#000', opacity: 1 },
  { name: '消しゴム（大）', tool: 'eraser', size: 30, color: '#000', opacity: 1 },
];
```

## アーキテクチャ改善案

### 状態管理

現在はProp Drilling。大規模化なら：

```typescript
// ZustandやJotaiで状態管理
interface AppStore {
  canvas: CanvasState;
  tools: ToolState;
  history: HistoryState;
  
  // Actions
  draw: (point: Point) => void;
  undo: () => void;
  redo: () => void;
  setTool: (tool: Tool) => void;
}
```

### 描画エンジンの抽象化

```typescript
interface DrawingEngine {
  init(canvas: HTMLCanvasElement): void;
  startStroke(point: Point, tool: Tool): void;
  continueStroke(point: Point): void;
  endStroke(): void;
  undo(): void;
  redo(): void;
  clear(): void;
  export(): string;
}

// Canvas2D実装
class Canvas2DEngine implements DrawingEngine { }

// 将来的にWebGL実装
class WebGLEngine implements DrawingEngine { }
```
