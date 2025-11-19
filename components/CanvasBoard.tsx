import React, { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { ToolMode, Point, CellAnnotation, ProjectImage } from '../types';
import { getMousePos, screenToWorld, drawAIAnnotations } from '../utils/canvasUtils';
import { detectObjects } from '../services/gemini';

interface CanvasBoardProps {
  activeImage: ProjectImage | null;
  activeTool: ToolMode;
  brushSize: number;
  triggerAutoSegment: boolean;
  setTriggerAutoSegment: (v: boolean) => void;
  segmentationTarget: string;
  setIsProcessing: (v: boolean) => void;
  scale: number;
  setScale: (v: number) => void;
}

export interface CanvasBoardRef {
  snapshot: () => { maskData: string | null; annotations: CellAnnotation[] };
  getCanvas: () => HTMLCanvasElement | null;
}

export const CanvasBoard = forwardRef<CanvasBoardRef, CanvasBoardProps>(({
  activeImage,
  activeTool,
  brushSize,
  triggerAutoSegment,
  setTriggerAutoSegment,
  segmentationTarget,
  setIsProcessing,
  scale,
  setScale
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));
  
  // Internal state for the loaded image object (HTMLImageElement)
  const [loadedImg, setLoadedImg] = useState<HTMLImageElement | null>(null);
  
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastPos, setLastPos] = useState<Point | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [detectedCells, setDetectedCells] = useState<CellAnnotation[]>([]);

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    snapshot: () => {
      if (!maskCanvasRef.current || !loadedImg) return { maskData: null, annotations: [] };
      return {
        maskData: maskCanvasRef.current.toDataURL(),
        annotations: detectedCells
      };
    },
    getCanvas: () => maskCanvasRef.current
  }));

  // Load Image when activeImage changes
  useEffect(() => {
    if (activeImage) {
      const img = new Image();
      img.src = activeImage.src;
      img.onload = () => {
        setLoadedImg(img);
        
        // Setup mask canvas size
        maskCanvasRef.current.width = img.width;
        maskCanvasRef.current.height = img.height;
        const ctx = maskCanvasRef.current.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, img.width, img.height);
          
          // Restore mask if exists
          if (activeImage.maskData) {
            const maskImg = new Image();
            maskImg.src = activeImage.maskData;
            maskImg.onload = () => {
              ctx.drawImage(maskImg, 0, 0);
              draw(); // Redraw after mask loads
            };
          }
        }

        // Restore annotations
        setDetectedCells(activeImage.annotations || []);

        // Reset View to fit
        if (containerRef.current) {
          const viewportW = containerRef.current.clientWidth;
          const viewportH = containerRef.current.clientHeight;
          const fitScale = Math.min(
            (viewportW - 40) / img.width,
            (viewportH - 40) / img.height,
            1
          );
          setScale(fitScale);
          setOffset({
            x: (viewportW - img.width * fitScale) / 2,
            y: (viewportH - img.height * fitScale) / 2
          });
        }
      };
    } else {
      setLoadedImg(null);
      setDetectedCells([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeImage?.id]); // Only reload if ID changes

  // Handle Auto-Segmentation Trigger
  useEffect(() => {
    const runAutoSegment = async () => {
      if (triggerAutoSegment && loadedImg && activeImage) {
        setIsProcessing(true);
        try {
          // Extract base64 from current loaded image for API
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = loadedImg.width;
          tempCanvas.height = loadedImg.height;
          const ctx = tempCanvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(loadedImg, 0, 0);
            // Use JPEG for faster upload, reasonable quality
            const base64 = tempCanvas.toDataURL('image/jpeg', 0.8).split(',')[1];
            
            const objects = await detectObjects(base64, segmentationTarget);
            setDetectedCells(objects);

            // Draw results onto the mask layer
            const maskCtx = maskCanvasRef.current.getContext('2d');
            if (maskCtx) {
              drawAIAnnotations(maskCtx, objects, loadedImg.width, loadedImg.height);
            }
            draw();
          }
        } catch (e) {
          console.error("Segmentation failed", e);
          alert("AI Analysis failed. Please check your API key and try again.");
        } finally {
          setIsProcessing(false);
          setTriggerAutoSegment(false);
        }
      }
    };
    runAutoSegment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerAutoSegment, loadedImg]);

  // Main Draw Loop
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // Clear screen
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (!loadedImg) return;

    ctx.save();
    
    // Apply transformations
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);
    
    // 1. Draw Image
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(loadedImg, 0, 0);

    // 2. Draw Mask (Composite)
    ctx.globalAlpha = 0.6;
    ctx.drawImage(maskCanvasRef.current, 0, 0);
    ctx.globalAlpha = 1.0;

    ctx.restore();
  }, [loadedImg, offset, scale]);

  // Render loop on state change
  useEffect(() => {
    draw();
  }, [draw, offset, scale, detectedCells]);

  // Resize observer
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        canvasRef.current.width = containerRef.current.clientWidth;
        canvasRef.current.height = containerRef.current.clientHeight;
        draw();
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [draw]);

  // Mouse Event Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!loadedImg) return;
    const pos = getMousePos(canvasRef.current!, e);
    
    if (activeTool === ToolMode.PAN) {
      setIsDragging(true);
      setLastPos(pos);
    } else if (activeTool === ToolMode.BRUSH || activeTool === ToolMode.ERASER) {
      setIsDrawing(true);
      paint(pos);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const pos = getMousePos(canvasRef.current!, e);

    if (isDragging && lastPos) {
      const dx = pos.x - lastPos.x;
      const dy = pos.y - lastPos.y;
      setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setLastPos(pos);
    }

    if (isDrawing && (activeTool === ToolMode.BRUSH || activeTool === ToolMode.ERASER)) {
      paint(pos);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsDrawing(false);
    setLastPos(null);
  };

  const paint = (screenPos: Point) => {
    if (!loadedImg) return;
    
    const worldPos = screenToWorld(screenPos, offset, scale);
    const maskCtx = maskCanvasRef.current.getContext('2d');
    if (!maskCtx) return;

    maskCtx.beginPath();
    maskCtx.arc(worldPos.x, worldPos.y, brushSize / 2, 0, Math.PI * 2);
    
    if (activeTool === ToolMode.BRUSH) {
      maskCtx.globalCompositeOperation = 'source-over';
      maskCtx.fillStyle = 'rgba(255, 255, 0, 1)'; 
    } else {
      maskCtx.globalCompositeOperation = 'destination-out';
      maskCtx.fillStyle = 'rgba(0,0,0,1)';
    }
    
    maskCtx.fill();
    draw();
  };

  return (
    <div 
      id="canvas-board"
      ref={containerRef} 
      className={`flex-1 relative bg-black overflow-hidden cursor-${activeTool === ToolMode.PAN ? (isDragging ? 'grabbing' : 'grab') : 'crosshair'}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {!activeImage && (
         <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 pointer-events-none">
           <div className="bg-slate-900/50 p-8 rounded-2xl border border-slate-800 backdrop-blur-sm text-center">
             <h2 className="text-2xl font-light text-indigo-400 mb-2">No Image Selected</h2>
             <p className="text-sm">Select or upload an image from the gallery to begin.</p>
           </div>
         </div>
      )}
      <canvas ref={canvasRef} className="block" />
      
      {/* Floating Info Panel */}
      {activeImage && (
        <div className="absolute bottom-4 right-4 pointer-events-none">
           <div className="bg-slate-900/80 backdrop-blur p-3 rounded-lg border border-slate-700 text-xs font-mono text-slate-400 shadow-xl">
             <div>ZOOM: {(scale * 100).toFixed(0)}%</div>
             <div>RES: {activeImage.width}x{activeImage.height}</div>
             <div>COUNT: {detectedCells.length}</div>
           </div>
        </div>
      )}
    </div>
  );
});