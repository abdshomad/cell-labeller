
import React, { useState, useEffect, useRef } from 'react';
import { Toolbar } from './components/Toolbar';
import { CanvasBoard, CanvasBoardRef } from './components/CanvasBoard';
import { Gallery } from './components/Gallery';
import { ExportModal } from './components/ExportModal';
import { Tour } from './components/Tour';
import { ToolMode, ProjectImage, ExportFormat, TourStep, ViewMode } from './types';
import { exportToCSV, exportToJSON, downloadImage } from './utils/canvasUtils';
import { CircleHelp } from 'lucide-react';

// Simple ID generator if uuid package isn't available in environment
const generateId = () => Math.random().toString(36).substring(2, 15);

const App: React.FC = () => {
  const [activeTool, setActiveTool] = useState<ToolMode>(ToolMode.BRUSH);
  const [brushSize, setBrushSize] = useState(10);
  const [isProcessing, setIsProcessing] = useState(false);
  const [triggerAutoSegment, setTriggerAutoSegment] = useState(false);
  const [segmentationTarget, setSegmentationTarget] = useState("biological cells");
  const [scale, setScale] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>('single');
  
  // Image Management
  const [images, setImages] = useState<ProjectImage[]>([]);
  const [activeImageId, setActiveImageId] = useState<string | null>(null);
  
  // Modals & Tour
  const [showExportModal, setShowExportModal] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);

  const canvasRef = useRef<CanvasBoardRef>(null);

  // Define Tour Steps
  const tourSteps: TourStep[] = [
    {
      targetId: null,
      title: "Welcome to CellScout",
      description: "A professional AI-powered tool for microscopy cell annotation and generic object detection. Let's take a quick tour.",
      position: 'center'
    },
    {
      targetId: 'tools-group',
      title: "Annotation Tools",
      description: "Use the Brush and Eraser to manually label or correct masks. Use the Pan tool (or hold Space) to navigate large images.",
      position: 'right'
    },
    {
      targetId: 'btn-auto-segment',
      title: "AI Analysis",
      description: "Click this button to analyze your image. You can ask Gemini to find specific objects (like 'cells', 'chickens', 'cars').",
      position: 'right'
    },
    {
      targetId: 'gallery-panel',
      title: "Image Gallery",
      description: "Manage your workspace here. Upload new images, switch between them, and delete ones you don't need.",
      position: 'left'
    },
    {
      targetId: 'canvas-board',
      title: "Workspace",
      description: "This is your main canvas. You can zoom in/out using the controls. AI detections will appear here as colored overlays.",
      position: 'top'
    },
    {
      targetId: 'btn-export',
      title: "Export Data",
      description: "When you're done, export your data as CSV coordinates, JSON datasets, or binary PNG masks.",
      position: 'right'
    }
  ];

  // Initialize with demo images
  useEffect(() => {
    const initDemo = async () => {
      const loadedImages: ProjectImage[] = [];
      
      // 1. Load Microscopy Demo
      const img1 = new Image();
      img1.crossOrigin = "anonymous";
      img1.src = "https://picsum.photos/800/600?grayscale";
      
      // 2. Load Chicken Demo
      const img2 = new Image();
      img2.crossOrigin = "anonymous";
      img2.src = "https://images.unsplash.com/photo-1569260399093-59e853436158?auto=format&fit=crop&w=800&q=80";

      const waitForLoad = (img: HTMLImageElement, name: string) => {
        return new Promise<void>((resolve) => {
          img.onload = () => {
             loadedImages.push({
              id: generateId(),
              name: name,
              src: img.src,
              width: img.width,
              height: img.height,
              annotations: [],
              maskData: null
            });
            resolve();
          };
          img.onerror = () => resolve(); // proceed even if error
        });
      };

      await Promise.all([
        waitForLoad(img1, "microscopy_sample.jpg"),
        waitForLoad(img2, "chickens_sample.jpg")
      ]);

      if (loadedImages.length > 0) {
        setImages(loadedImages);
        setActiveImageId(loadedImages[0].id);
      }
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
    }
  };

  const handleAutoSegment = () => {
    const defaultPrompt = activeImage?.name.includes('chicken') ? 'chickens' : 'biological cells';
    const target = prompt("What would you like to detect in this image?", defaultPrompt);
    
    if (target) {
      setSegmentationTarget(target);
      setTriggerAutoSegment(true);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcuts if modal is open
      if (showExportModal || isTourOpen) return;

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
  }, [activeTool, showExportModal, isTourOpen]);

  return (
    <div className="flex h-screen w-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30 overflow-hidden">
      {/* Left Toolbar */}
      <Toolbar 
        activeTool={activeTool} 
        onToolChange={setActiveTool}
        onUpload={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()} 
        onDownload={handleExportRequest}
        onAutoSegment={handleAutoSegment}
        onClearMask={handleClearMask}
        isProcessing={isProcessing}
        brushSize={brushSize}
        setBrushSize={setBrushSize}
        scale={scale}
        setScale={setScale}
        viewMode={viewMode}
        setViewMode={setViewMode}
      />

      {/* Main Canvas Area */}
      <div className="flex-1 relative flex flex-col min-w-0">
        {/* Top Bar / Header */}
        <div className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 shadow-sm z-10 shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="font-semibold text-slate-100 tracking-tight">CellScout</h1>
            <span className="text-xs bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20 font-mono">PRO</span>
            <button 
              onClick={() => setIsTourOpen(true)}
              className="ml-2 text-slate-500 hover:text-indigo-400 transition-colors p-1 rounded-full hover:bg-slate-800"
              title="Start Tour"
            >
              <CircleHelp size={18} />
            </button>
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
          segmentationTarget={segmentationTarget}
          setIsProcessing={setIsProcessing}
          scale={scale}
          setScale={setScale}
          viewMode={viewMode}
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

      <Tour 
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
        steps={tourSteps}
      />
    </div>
  );
};

export default App;
