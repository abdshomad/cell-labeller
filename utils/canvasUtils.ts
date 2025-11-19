import React from 'react';
import { Point, CellAnnotation } from '../types';

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
    // We use a seeded-like random based on ID to keep colors consistent
    const hash = ann.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hue = hash % 360;
    
    ctx.fillStyle = `hsla(${hue}, 70%, 60%, 0.8)`;
    ctx.beginPath();
    // Draw an ellipse as a rough approximation of a cell shape
    ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, 2 * Math.PI);
    ctx.fill();
  });
  ctx.restore();
};