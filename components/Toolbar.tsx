import React from 'react';
import { 
  Brush, 
  Eraser, 
  Hand, 
  Download, 
  Upload, 
  Bot, 
  ZoomIn, 
  ZoomOut,
  Trash2
} from 'lucide-react';
import { ToolMode } from '../types';

interface ToolbarProps {
  activeTool: ToolMode;
  onToolChange: (tool: ToolMode) => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDownload: () => void;
  onAutoSegment: () => void;
  onClearMask: () => void;
  isProcessing: boolean;
  brushSize: number;
  setBrushSize: (size: number) => void;
  scale: number;
  setScale: (scale: number) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  activeTool,
  onToolChange,
  onUpload,
  onDownload,
  onAutoSegment,
  onClearMask,
  isProcessing,
  brushSize,
  setBrushSize,
  scale,
  setScale
}) => {
  
  const buttonClass = (tool: ToolMode) => `
    p-3 rounded-xl transition-all duration-200 flex items-center justify-center mb-2
    ${activeTool === tool 
      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' 
      : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
    }
  `;

  const actionButtonClass = `
    p-3 rounded-xl bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white
    transition-all duration-200 flex items-center justify-center mb-2
  `;

  return (
    <div className="w-20 bg-slate-900 border-r border-slate-800 flex flex-col items-center py-6 h-full z-20 shadow-xl">
      <div className="mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-indigo-500/20 shadow-lg">
          <span className="font-bold text-white text-xl">C</span>
        </div>
      </div>

      {/* Primary Tools */}
      <div className="flex flex-col w-full px-3 space-y-1">
        <button 
          onClick={() => onToolChange(ToolMode.PAN)}
          className={buttonClass(ToolMode.PAN)}
          title="Pan (Space)"
        >
          <Hand size={20} />
        </button>
        <button 
          onClick={() => onToolChange(ToolMode.BRUSH)}
          className={buttonClass(ToolMode.BRUSH)}
          title="Brush (B)"
        >
          <Brush size={20} />
        </button>
        <button 
          onClick={() => onToolChange(ToolMode.ERASER)}
          className={buttonClass(ToolMode.ERASER)}
          title="Eraser (E)"
        >
          <Eraser size={20} />
        </button>
      </div>

      {/* Separator */}
      <div className="w-10 h-px bg-slate-800 my-4"></div>

      {/* Brush Settings (Only show if Brush/Eraser active) */}
      {(activeTool === ToolMode.BRUSH || activeTool === ToolMode.ERASER) && (
        <div className="px-2 mb-4 flex flex-col items-center animate-fadeIn">
          <label className="text-[10px] text-slate-500 mb-1 font-mono">SIZE</label>
          <input 
            type="range" 
            min="1" 
            max="50" 
            value={brushSize} 
            onChange={(e) => setBrushSize(parseInt(e.target.value))}
            className="h-24 w-1 bg-slate-700 rounded-lg appearance-none cursor-pointer vertical-range accent-indigo-500"
            style={{ writingMode: 'vertical-lr', WebkitAppearance: 'slider-vertical' } as any}
          />
          <div className="mt-2 text-xs text-slate-400 font-mono">{brushSize}px</div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col w-full px-3 mt-auto">
        <button 
          onClick={() => setScale(scale * 1.1)}
          className={actionButtonClass}
          title="Zoom In"
        >
          <ZoomIn size={20} />
        </button>
        <button 
          onClick={() => setScale(Math.max(0.1, scale * 0.9))}
          className={actionButtonClass}
          title="Zoom Out"
        >
          <ZoomOut size={20} />
        </button>
        
        <div className="w-full h-px bg-slate-800 my-2"></div>

        <button 
          onClick={onAutoSegment}
          disabled={isProcessing}
          className={`
            p-3 rounded-xl transition-all duration-200 flex flex-col items-center justify-center mb-2 gap-1
            ${isProcessing 
              ? 'bg-indigo-900/30 text-indigo-400 cursor-wait' 
              : 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white hover:shadow-lg hover:shadow-indigo-500/30 hover:scale-105'
            }
          `}
          title="Auto Segment with AI"
        >
          {isProcessing ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : (
            <Bot size={20} />
          )}
          <span className="text-[9px] font-bold tracking-wider">AUTO</span>
        </button>

        <button onClick={onClearMask} className={actionButtonClass} title="Clear Mask">
          <Trash2 size={20} />
        </button>

        <div className="relative">
           <input
            type="file"
            accept="image/*"
            onChange={onUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            title="Upload Image"
          />
          <button className={actionButtonClass}>
            <Upload size={20} />
          </button>
        </div>

        <button onClick={onDownload} className={actionButtonClass} title="Export Mask">
          <Download size={20} />
        </button>
      </div>
    </div>
  );
};