export enum ToolMode {
  PAN = 'PAN',
  BRUSH = 'BRUSH',
  ERASER = 'ERASER',
  PICKER = 'PICKER'
}

export interface Point {
  x: number;
  y: number;
}

export interface CellAnnotation {
  id: string;
  bbox: [number, number, number, number]; // ymin, xmin, ymax, xmax (normalized 0-1)
  confidence: number;
  label: string;
}

export interface EditorState {
  scale: number;
  offset: Point;
  isDragging: boolean;
  lastMousePos: Point | null;
  brushSize: number;
  opacity: number;
  showOriginal: boolean;
  showMask: boolean;
}

export interface ProjectImage {
  id: string;
  name: string;
  src: string; // Base64 or URL
  width: number;
  height: number;
  annotations: CellAnnotation[];
  maskData: string | null; // Base64 of the mask layer
}

export type ExportFormat = 'json' | 'csv' | 'png_mask';

export interface TourStep {
  targetId: string | null; // null indicates a centered modal (no specific target)
  title: string;
  description: string;
  position?: 'left' | 'right' | 'top' | 'bottom' | 'center';
}