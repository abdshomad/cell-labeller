import React from 'react';
import { ProjectImage } from '../types';
import { Plus, Trash2, Image as ImageIcon } from 'lucide-react';

interface GalleryProps {
  images: ProjectImage[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDelete: (id: string) => void;
}

export const Gallery: React.FC<GalleryProps> = ({
  images,
  activeId,
  onSelect,
  onUpload,
  onDelete
}) => {
  return (
    <div id="gallery-panel" className="w-64 bg-slate-900 border-l border-slate-800 flex flex-col h-full z-20 shadow-xl">
      <div className="p-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Gallery</h2>
        <div className="relative group">
          <input
            type="file"
            accept="image/*"
            onChange={onUpload}
            multiple
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
          <button className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg transition-colors text-sm font-medium">
            <Plus size={16} />
            <span>Add Images</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {images.length === 0 && (
          <div className="text-center py-10 text-slate-600">
            <ImageIcon size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">No images yet</p>
          </div>
        )}
        
        {images.map((img) => (
          <div
            key={img.id}
            onClick={() => onSelect(img.id)}
            className={`
              group relative rounded-lg overflow-hidden border-2 transition-all cursor-pointer
              ${activeId === img.id 
                ? 'border-indigo-500 shadow-lg shadow-indigo-500/20 bg-slate-800' 
                : 'border-transparent hover:border-slate-600 bg-slate-900'
              }
            `}
          >
            <div className="aspect-video w-full bg-slate-950 relative">
              <img 
                src={img.src} 
                alt={img.name} 
                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
              />
              {/* Overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 to-transparent opacity-60"></div>
              
              {/* Badge for annotations */}
              {(img.annotations.length > 0 || img.maskData) && (
                 <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-400 shadow-emerald-400/50 shadow-sm"></div>
              )}
            </div>
            
            <div className="p-3 absolute bottom-0 w-full">
              <div className="flex items-center justify-between">
                <div className="truncate pr-2">
                  <p className="text-xs font-medium text-slate-200 truncate">{img.name}</p>
                  <p className="text-[10px] text-slate-500">{img.width}x{img.height}</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(img.id);
                  }}
                  className="p-1.5 rounded-md text-slate-500 hover:text-red-400 hover:bg-slate-800 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="p-3 border-t border-slate-800 bg-slate-900 text-center">
        <p className="text-[10px] text-slate-600">
          {images.length} Image{images.length !== 1 ? 's' : ''} Loaded
        </p>
      </div>
    </div>
  );
};