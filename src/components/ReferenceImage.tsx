import { useEffect, useRef } from 'react';
import type { ReferenceAsset, ImageTransform } from '../types';
import { transformCSS } from '../lib/geometry';

interface Props { asset: ReferenceAsset; transform: ImageTransform; grayscale: boolean; opacity?: number }
export function ReferenceImage({ asset, transform, grayscale, opacity = 1 }: Props) {
  const imageRef = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const url = URL.createObjectURL(asset.blob);
    const image = imageRef.current;
    if (image) image.src = url;
    return () => { URL.revokeObjectURL(url); };
  }, [asset]);
  return <div className="reference-layer" style={{ opacity }} aria-hidden="true">
    <img ref={imageRef} alt="" draggable={false} style={{
      transform: transformCSS(transform), filter: grayscale ? 'grayscale(1)' : undefined,
    }} />
  </div>;
}
