import type { ReferenceAsset } from '../types';
import { canvasBlob } from './drawing';

export async function readReference(file: File): Promise<ReferenceAsset> {
  if (!file.type.startsWith('image/')) throw new Error('画像ファイルを選択してほしい');
  if (file.size > 40 * 1024 * 1024) throw new Error('40MB以下の画像を選択してほしい');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('画像を読み込めない。PNGまたはJPEGに変換して再度選択してほしい'));
      image.src = url;
    });
    const w = image.naturalWidth, h = image.naturalHeight;
    if (!w || !h || w * h > 64_000_000) throw new Error('画像の寸法が大きすぎる。縮小してから選択してほしい');
    const scale = Math.min(1, 2560 / Math.max(w, h));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(w * scale));
    canvas.height = Math.max(1, Math.round(h * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('画像の処理に必要なメモリを確保できない');
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    // Rasterize even SVGs; keep reference images local and normalize their size.
    const blob = await canvasBlob(canvas, file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png', 0.9);
    return { blob, width: canvas.width, height: canvas.height, name: file.name };
  } finally {
    URL.revokeObjectURL(url);
  }
}
