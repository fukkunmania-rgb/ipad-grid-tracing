import { useRef, useCallback, useEffect, useState } from 'react';
import type { Tool, Point } from '../types';

const MAX_HISTORY = 30;

export function useCanvas(
  width: number,
  height: number,
  currentTool: Tool,
  penColor: string,
  penSize: number,
  eraserSize: number
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<Point | null>(null);
  
  // History for Undo/Redo
  const historyRef = useRef<ImageData[]>([]);
  const historyIndexRef = useRef(-1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Initialize canvas with retina support
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    
    // Set actual canvas size (internal resolution)
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    
    // Set CSS display size
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d', {
      alpha: true,
      desynchronized: true, // Low latency rendering hint
    });
    
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      contextRef.current = ctx;
      
      // Save initial blank state
      saveState();
    }
  }, [width, height]);

  // Save current state to history
  const saveState = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    if (!canvas || !ctx) return;

    // Remove any redo states
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    }

    // Save current state
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    historyRef.current.push(imageData);

    // Limit history size
    if (historyRef.current.length > MAX_HISTORY) {
      historyRef.current.shift();
    } else {
      historyIndexRef.current++;
    }

    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(false);
  }, []);

  // Undo
  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    
    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    if (!canvas || !ctx) return;

    historyIndexRef.current--;
    const imageData = historyRef.current[historyIndexRef.current];
    ctx.putImageData(imageData, 0, 0);
    
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
  }, []);

  // Redo
  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    
    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    if (!canvas || !ctx) return;

    historyIndexRef.current++;
    const imageData = historyRef.current[historyIndexRef.current];
    ctx.putImageData(imageData, 0, 0);
    
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
  }, []);

  // Clear canvas
  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, width, height);
    saveState();
  }, [width, height, saveState]);

  // Get coordinates from pointer event
  const getCoordinates = useCallback((e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      pressure: e.pressure !== 0.5 ? e.pressure : undefined,
    };
  }, []);

  // Start drawing
  const startDrawing = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return; // Only left click/main pointer
    
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    canvas.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;
    
    const point = getCoordinates(e);
    lastPointRef.current = point;

    // Draw a single dot if it's just a tap
    const ctx = contextRef.current;
    if (ctx) {
      ctx.beginPath();
      ctx.arc(point.x, point.y, getCurrentSize() / 2, 0, Math.PI * 2);
      ctx.fillStyle = currentTool === 'eraser' ? 'rgba(0,0,0,1)' : penColor;
      ctx.fill();
      
      if (currentTool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
      } else {
        ctx.globalCompositeOperation = 'source-over';
      }
    }
  }, [currentTool, penColor, getCoordinates]);

  // Get current tool size
  const getCurrentSize = useCallback(() => {
    return currentTool === 'eraser' ? eraserSize : penSize;
  }, [currentTool, eraserSize, penSize]);

  // Draw
  const draw = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();

    const ctx = contextRef.current;
    const lastPoint = lastPointRef.current;
    if (!ctx || !lastPoint) return;

    const point = getCoordinates(e);
    
    // Set composite operation
    if (currentTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
    } else {
      ctx.globalCompositeOperation = 'source-over';
    }

    // Calculate line width based on pressure (Apple Pencil support)
    const pressure = point.pressure || 1;
    const baseSize = getCurrentSize();
    const lineWidth = baseSize * (0.5 + pressure * 0.5);

    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = penColor;

    // Draw smooth line
    ctx.beginPath();
    ctx.moveTo(lastPoint.x, lastPoint.y);
    
    // Use quadratic curve for smoother lines
    const midX = (lastPoint.x + point.x) / 2;
    const midY = (lastPoint.y + point.y) / 2;
    ctx.quadraticCurveTo(lastPoint.x, lastPoint.y, midX, midY);
    
    ctx.stroke();

    lastPointRef.current = point;
  }, [currentTool, penColor, getCurrentSize, getCoordinates]);

  // Stop drawing
  const stopDrawing = useCallback((e?: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    
    isDrawingRef.current = false;
    lastPointRef.current = null;
    
    const ctx = contextRef.current;
    if (ctx) {
      ctx.globalCompositeOperation = 'source-over';
    }
    
    saveState();
    
    if (e) {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.releasePointerCapture(e.pointerId);
      }
    }
  }, [saveState]);

  // Export canvas as PNG
  const exportPNG = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    
    return canvas.toDataURL('image/png');
  }, []);

  // Initialize on mount
  useEffect(() => {
    initCanvas();
  }, [initCanvas]);

  return {
    canvasRef,
    contextRef,
    startDrawing,
    draw,
    stopDrawing,
    undo,
    redo,
    clear,
    canUndo,
    canRedo,
    exportPNG,
  };
}
