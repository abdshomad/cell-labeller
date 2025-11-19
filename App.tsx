import React, { useState, useEffect, useRef } from 'react';
import { Toolbar } from './components/Toolbar';
import { CanvasBoard, CanvasBoardRef } from './components/CanvasBoard';
import { Gallery } from './components/Gallery';
import { ExportModal } from './components/ExportModal';
import { ToolMode, ProjectImage, ExportFormat } from './types';
import { exportToCSV, exportToJSON, downloadImage } from './utils/canvasUtils';
import { v4 as uuidv4 } from 'uuid'; // We need a unique ID generator, or simple random

// Simple ID generator if uuid package isn't available in environment, 
// but since we can't easily add packages, let's use a helper
const generateId = () => Math.random().toString(36).substring(2, 15);

const App: React.FC = () => {
  const [activeTool, setActiveTool] = useState<ToolMode>(ToolMode.BRUSH);
  const [brushSize, setBrushSize] = useState(10);
  const [isProcessing, setIsProcessing] = useState(false);
  const [triggerAutoSegment, setTriggerAutoSegment] = useState(false);
  const [scale, setScale] = useState(1);
  
  // Image Management
  const [images, setImages] = useState<ProjectImage[]>([]);
  const [activeImageId, setActiveImageId] = useState<string | null>(null);
  
  // Export UI
  const [showExportModal, setShowExportModal] = useState(false);

  const canvasRef = useRef<CanvasBoardRef>(null);

  // Initialize with a demo image
  useEffect(() => {
    const initDemo = async () => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = "https://picsum.photos/800/600?grayscale";
      img.onload = () => {
        const newImage: ProjectImage = {
          id: generateId(),
          name: "demo_sample.jpg",
          src: img.src,
          width: img.width,
          height: img.height,
          annotations: [],
          maskData: null
        };
        setImages([newImage]);
        setActiveImageId(newImage.id);
      };
    };
    initDemo();
  }, []);

  const activeImage = images.find(img => img.id === activeImageId) || null;

  // Save state of current image before switching or performing global actions
  const saveCurrentState = () => {
    if (activeImageId && canvasRef.current) {
      const { maskData, annotations } = canvasRef.current.snapshot();
      setImages(prev => prev.map(img => {
        if (img.id === activeImageId) {
          return { ...img, maskData, annotations };
        }
        return img;
      }));
    }
  };

  const handleImageSelect = (id: string) => {
    if (id === activeImageId) return;
    saveCurrentState();
    setActiveImageId(id);
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      saveCurrentState();
      
      Array.from(e.target.files).forEach((rawFile) => {
        const file = rawFile as File;
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            const newImg: ProjectImage = {
              id: generateId(),
              name: file.name,
              src: event.target?.result as string,
              width: img.width,
              height: img.height,
              annotations: [],
              maskData: null
            };
            setImages(prev => [...prev, newImg]);
            // If it's the first/only upload and nothing is active, or user wants to switch
            if (!activeImageId) setActiveImageId(newImg.id);
            // Optionally switch to the newest upload immediately
            setActiveImageId(newImg.id);
          };
          img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleDelete = (id: string) => {
    if (activeImageId === id) {
      setActiveImageId(null);
    }
    setImages(prev => prev.filter(img => img.id !== id));
  };

  const handleExportRequest = () => {
    saveCurrentState(); // Ensure latest strokes are saved to state
    if (activeImage) {
      setShowExportModal(true);
    } else {
      alert("No image selected to export.");
    }
  };

  const performExport = (format: ExportFormat) => {
    if (!activeImage) return;
    
    // We need to ensure the latest state is in `activeImage`.
    // Since setState is async, and we called saveCurrentState() before opening modal,
    // the `activeImage` from the find() selector should be fresh enough if re-rendered, 
    // but let's double check by pulling from canvas if modal was opened without switching.
    
    // However, since modal is open, canvas is still there. 
    // The state might have been updated when modal opened.
    // Let's use the latest `activeImage` from state.
    
    switch (format) {
      case 'csv':
        exportToCSV(activeImage);
        break;
      case 'json':
        exportToJSON(activeImage);
        break;
      case 'png_mask':
        if (activeImage.maskData) {
          downloadImage(activeImage.maskData, `${activeImage.name}_mask.png`);
        } else {
          alert("No mask data to export.");
        }
        break;
    }
    setShowExportModal(false);
  };

  const handleClearMask = () => {
    if (confirm("Are you sure you want to clear all annotations for this image?")) {
      setImages(prev => prev.map(img => {
        if (img.id === activeImageId) {
          return { ...img, maskData: null, annotations: [] };
        }
        return img;
      }));
      // Force re-render of canvas is handled by useEffect in CanvasBoard when prop changes,
      // but maskData changing to null should trigger the canvas clear logic there.
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcuts if modal is open
      if (showExportModal) return;

      if (e.key === ' ' && activeTool !== ToolMode.PAN) {
        setActiveTool(ToolMode.PAN);
      } else if (e.key === 'b') {
        setActiveTool(ToolMode.BRUSH);
      } else if (e.key === 'e') {
        setActiveTool(ToolMode.ERASER);
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') {
         setActiveTool(ToolMode.BRUSH);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [activeTool, showExportModal]);

  return (
    <div className="flex h-screen w-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30 overflow-hidden">
      {/* Left Toolbar */}
      <Toolbar 
        activeTool={activeTool} 
        onToolChange={setActiveTool}
        onUpload={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()} // Proxy to hidden input in gallery? Or we remove upload from Toolbar and keep in Gallery
        onDownload={handleExportRequest}
        onAutoSegment={() => setTriggerAutoSegment(true)}
        onClearMask={handleClearMask}
        isProcessing={isProcessing}
        brushSize={brushSize}
        setBrushSize={setBrushSize}
        scale={scale}
        setScale={setScale}
      />

      {/* Main Canvas Area */}
      <div className="flex-1 relative flex flex-col min-w-0">
        {/* Top Bar / Header */}
        <div className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 shadow-sm z-10 shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="font-semibold text-slate-100 tracking-tight">CellScout</h1>
            <span className="text-xs bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20 font-mono">PRO</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-400">
             {activeImage && <span className="font-mono text-xs opacity-50 mr-2">{activeImage.name}</span>}
             <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
                <span>Manual</span>
             </div>
             <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                <span>AI Detected</span>
             </div>
          </div>
        </div>

        {/* Canvas Wrapper */}
        <CanvasBoard 
          ref={canvasRef}
          activeImage={activeImage}
          activeTool={activeTool}
          brushSize={brushSize}
          triggerAutoSegment={triggerAutoSegment}
          setTriggerAutoSegment={setTriggerAutoSegment}
          setIsProcessing={setIsProcessing}
          scale={scale}
          setScale={setScale}
        />
      </div>

      {/* Right Gallery Panel */}
      <Gallery 
        images={images}
        activeId={activeImageId}
        onSelect={handleImageSelect}
        onUpload={handleUpload}
        onDelete={handleDelete}
      />

      {/* Modals */}
      <ExportModal 
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={performExport}
        imageName={activeImage?.name || "Untitled"}
      />
    </div>
  );
};

export default App;