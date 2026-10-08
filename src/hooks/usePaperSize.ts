import { useEffect, useRef, useState } from 'react';
import { fitPaper } from '../lib/geometry';

export function usePaperSize() {
  const referenceRef = useRef<HTMLDivElement>(null);
  const drawingRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 1, height: 1.25 });
  useEffect(() => {
    const reference = referenceRef.current, drawing = drawingRef.current;
    if (!reference || !drawing) return;
    const measure = () => {
      const a = reference.getBoundingClientRect(), b = drawing.getBoundingClientRect();
      const next = fitPaper(Math.min(a.width, b.width), Math.min(a.height, b.height));
      setSize(previous => Math.abs(previous.width - next.width) < 0.05 ? previous : next);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(reference);
    observer.observe(drawing);
    return () => observer.disconnect();
  }, []);
  return { referenceRef, drawingRef, size };
}
