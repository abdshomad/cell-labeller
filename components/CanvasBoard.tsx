import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ToolMode, EditorState, Point, CellAnnotation } from '../types';
import { getMousePos, screenToWorld, drawAIAnnotations } from '../utils/canvasUtils';
import { detectCells } from '../services/gemini';

interface CanvasBoardProps {
  image: HTMLImageElement | null;
  activeTool: ToolMode;
  brushSize: number;
  triggerAutoSegment: boolean;
  setTriggerAutoSegment: (v: boolean) => void;
  setIsProcessing: (v: boolean) => void;
  scale: number;
  setScale: (v: number) => void;
}

export const CanvasBoard: React.FC<CanvasBoardProps> = ({
  image,
  activeTool,
  brushSize,
  triggerAutoSegment,
  setTriggerAutoSegment,
  setIsProcessing,
  scale,
  setScale
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // The offscreen canvas stores the actual mask data at image resolution
  const maskCanvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));

  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastPos, setLastPos] = useState<Point | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [detectedCells, setDetectedCells] = useState<CellAnnotation[]>([]);

  // Initialize view when image loads
  useEffect(() => {
    if (image && containerRef.current) {
      // Center image
      const viewportW = containerRef.current.clientWidth;
      const viewportH = containerRef.current.clientHeight;
      
      // Calculate fit scale
      const scaleX = (viewportW - 40) / image.width;
      const scaleY = (viewportH - 40) / image.height;
      const fitScale = Math.min(scaleX, scaleY, 1); // Don't zoom in by default
      
      setScale(fitScale);
      
      setOffset({
        x: (viewportW - image.width * fitScale) / 2,
        y: (viewportH - image.height * fitScale) / 2
      });

      // Resize offscreen mask canvas to match image
      maskCanvasRef.current.width = image.width;
      maskCanvasRef.current.height = image.height;
      
      // Clear previous mask
      const ctx = maskCanvasRef.current.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, image.width, image.height);
      setDetectedCells([]);
    }
  }, [image, setScale]);

  // Handle Auto-Segmentation Trigger
  useEffect(() => {
    const runAutoSegment = async () => {
      if (triggerAutoSegment && image) {
        setIsProcessing(true);
        try {
          // Convert image to base64
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = image.width;
          tempCanvas.height = image.height;
          const ctx = tempCanvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(image, 0, 0);
            const base64 = tempCanvas.toDataURL('image/jpeg', 0.8).split(',')[1];
            
            const cells = await detectCells(base64);
            setDetectedCells(cells);

            // Draw results onto the mask layer
            const maskCtx = maskCanvasRef.current.getContext('2d');
            if (maskCtx) {
              drawAIAnnotations(maskCtx, cells, image.width, image.height);
            }
            requestAnimationFrame(draw);
          }
        } catch (e) {
          console.error("Segmentation failed", e);
          alert("AI Segmentation failed. Please check your API key and try again.");
        } finally {
          setIsProcessing(false);
          setTriggerAutoSegment(false);
        }
      }
    };
    runAutoSegment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerAutoSegment, image]);

  // Main Draw Loop
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !image) return;

    // Clear screen
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    
    // Apply transformations
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);
    
    // 1. Draw Image
    ctx.imageSmoothingEnabled = false; // Pixelated look for scientific feel
    ctx.drawImage(image, 0, 0);

    // 2. Draw Mask (Composite)
    ctx.globalAlpha = 0.6; // Semi-transparent mask
    ctx.drawImage(maskCanvasRef.current, 0, 0);
    ctx.globalAlpha = 1.0;

    ctx.restore();
  }, [image, offset, scale]);

  // Render loop on state change
  useEffect(() => {
    draw();
  }, [draw, offset, scale, detectedCells]); // Added detectedCells dep to force redraw if needed, though mask update usually handles it

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
    if (!image) return;
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
    if (!image) return;
    
    const worldPos = screenToWorld(screenPos, offset, scale);
    const maskCtx = maskCanvasRef.current.getContext('2d');
    if (!maskCtx) return;

    maskCtx.beginPath();
    maskCtx.arc(worldPos.x, worldPos.y, brushSize / 2, 0, Math.PI * 2);
    
    if (activeTool === ToolMode.BRUSH) {
      maskCtx.globalCompositeOperation = 'source-over';
      // Randomize color slightly for "instance" feel or keep uniform? 
      // Let's use a standard yellow/green for manual annotations to contrast with AI
      maskCtx.fillStyle = 'rgba(255, 255, 0, 1)'; 
    } else {
      maskCtx.globalCompositeOperation = 'destination-out';
      maskCtx.fillStyle = 'rgba(0,0,0,1)';
    }
    
    maskCtx.fill();
    draw(); // Re-render main canvas
  };

  return (
    <div 
      ref={containerRef} 
      className={`flex-1 relative bg-black overflow-hidden cursor-${activeTool === ToolMode.PAN ? (isDragging ? 'grabbing' : 'grab') : 'crosshair'}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {!image && (
         <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 pointer-events-none">
           <div className="bg-slate-900/50 p-8 rounded-2xl border border-slate-800 backdrop-blur-sm text-center">
             <h2 className="text-2xl font-light text-indigo-400 mb-2">No Image Loaded</h2>
             <p className="text-sm">Upload a microscopy image to begin analysis.</p>
           </div>
         </div>
      )}
      <canvas ref={canvasRef} className="block" />
      
      {/* Floating Info Panel */}
      <div className="absolute bottom-4 right-4 pointer-events-none">
         <div className="bg-slate-900/80 backdrop-blur p-3 rounded-lg border border-slate-700 text-xs font-mono text-slate-400 shadow-xl">
           {image ? (
             <>
              <div>ZOOM: {(scale * 100).toFixed(0)}%</div>
              <div>RES: {image.width}x{image.height}</div>
              <div>CELLS: {detectedCells.length}</div>
             </>
           ) : (
             <div>READY</div>
           )}
         </div>
      </div>
    </div>
  );
};