import React from 'react';
import { Point, CellAnnotation, ProjectImage } from '../types';

export const getMousePos = (canvas: HTMLCanvasElement, evt: React.MouseEvent): Point => {
  const rect = canvas.getBoundingClientRect();
  return {
    x: evt.clientX - rect.left,
    y: evt.clientY - rect.top
  };
};

export const screenToWorld = (screenPos: Point, offset: Point, scale: number): Point => {
  return {
    x: (screenPos.x - offset.x) / scale,
    y: (screenPos.y - offset.y) / scale
  };
};

export const worldToScreen = (worldPos: Point, offset: Point, scale: number): Point => {
  return {
    x: worldPos.x * scale + offset.x,
    y: worldPos.y * scale + offset.y
  };
};

// Helper to draw bounding box approximations on the mask layer
export const drawAIAnnotations = (
  ctx: CanvasRenderingContext2D, 
  annotations: CellAnnotation[], 
  width: number, 
  height: number
) => {
  ctx.save();
  annotations.forEach(ann => {
    const [ymin, xmin, ymax, xmax] = ann.bbox;
    const x = xmin * width;
    const y = ymin * height;
    const w = (xmax - xmin) * width;
    const h = (ymax - ymin) * height;
    
    // Simulate CellPose style masks with random colors for each instance
    const hash = ann.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hue = hash % 360;
    
    ctx.fillStyle = `hsla(${hue}, 70%, 60%, 0.8)`;
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, 2 * Math.PI);
    ctx.fill();
  });
  ctx.restore();
};

export const exportToCSV = (image: ProjectImage) => {
  const headers = ['id', 'label', 'confidence', 'ymin', 'xmin', 'ymax', 'xmax'];
  const rows = image.annotations.map(ann => [
    ann.id,
    ann.label,
    ann.confidence.toFixed(4),
    ann.bbox[0].toFixed(4),
    ann.bbox[1].toFixed(4),
    ann.bbox[2].toFixed(4),
    ann.bbox[3].toFixed(4)
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(r => r.join(','))
  ].join('\n');
  
  downloadFile(csvContent, `${image.name.replace(/\.[^/.]+$/, "")}_annotations.csv`, 'text/csv');
};

export const exportToJSON = (image: ProjectImage) => {
  const data = {
    image: image.name,
    width: image.width,
    height: image.height,
    created_at: new Date().toISOString(),
    annotations: image.annotations,
    // We include the mask data primarily if manual edits were made
    maskData: image.maskData 
  };
  
  const jsonContent = JSON.stringify(data, null, 2);
  downloadFile(jsonContent, `${image.name.replace(/\.[^/.]+$/, "")}_data.json`, 'application/json');
};

export const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const downloadImage = (dataUrl: string, filename: string) => {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};