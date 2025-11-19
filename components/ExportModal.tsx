import React from 'react';
import { FileJson, FileSpreadsheet, Image as ImageIcon, X } from 'lucide-react';
import { ExportFormat } from '../types';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: ExportFormat) => void;
  imageName: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, onExport, imageName }) => {
  if (!isOpen) return null;

  const optionClass = "flex flex-col items-center justify-center p-6 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 hover:border-indigo-500 transition-all cursor-pointer gap-3 group";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 rounded-2xl w-full max-w-md border border-slate-700 shadow-2xl p-6 relative animate-fadeIn">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white"
        >
          <X size={20} />
        </button>

        <h2 className="text-xl font-bold text-white mb-1">Export Data</h2>
        <p className="text-sm text-slate-400 mb-6">Select export format for <span className="text-indigo-400">{imageName}</span></p>

        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => onExport('json')}
            className={optionClass}
          >
            <FileJson size={32} className="text-yellow-400 group-hover:scale-110 transition-transform" />
            <div className="text-center">
              <span className="block font-bold text-slate-200">JSON</span>
              <span className="text-xs text-slate-500">Full dataset & mask</span>
            </div>
          </button>

          <button 
            onClick={() => onExport('csv')}
            className={optionClass}
          >
            <FileSpreadsheet size={32} className="text-emerald-400 group-hover:scale-110 transition-transform" />
            <div className="text-center">
              <span className="block font-bold text-slate-200">CSV</span>
              <span className="text-xs text-slate-500">Annotations list</span>
            </div>
          </button>

          <button 
            onClick={() => onExport('png_mask')}
            className={`${optionClass} col-span-2`}
          >
            <ImageIcon size={32} className="text-purple-400 group-hover:scale-110 transition-transform" />
            <div className="text-center">
              <span className="block font-bold text-slate-200">Mask Image (PNG)</span>
              <span className="text-xs text-slate-500">Binary segmentation mask</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};