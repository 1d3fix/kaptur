export type ShapeType =
  | 'rect'
  | 'arrow'
  | 'text'
  | 'highlight'
  | 'blur'
  | 'number';

export type Tool = 'select' | ShapeType;

interface BaseShape {
  id: string;
  type: ShapeType;
}

export interface RectShape extends BaseShape {
  type: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
  stroke: string;
  strokeWidth: number;
}

export interface ArrowShape extends BaseShape {
  type: 'arrow';
  points: [number, number, number, number];
  stroke: string;
  strokeWidth: number;
}

export interface TextShape extends BaseShape {
  type: 'text';
  x: number;
  y: number;
  text: string;
  fontSize: number;
  fill: string;
}

export interface HighlightShape extends BaseShape {
  type: 'highlight';
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
}

export interface BlurShape extends BaseShape {
  type: 'blur';
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
}

export interface NumberShape extends BaseShape {
  type: 'number';
  x: number;
  y: number;
  index: number;
  color: string;
  radius: number;
}

export type Shape =
  | RectShape
  | ArrowShape
  | TextShape
  | HighlightShape
  | BlurShape
  | NumberShape;

export interface AnnotationData {
  version: 1;
  shapes: Shape[];
}

export const STROKE_LEVELS = [2, 4, 6] as const;
export type StrokeLevel = (typeof STROKE_LEVELS)[number];

export const PALETTE = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#000000', // black
  '#ffffff', // white
] as const;

export const HIGHLIGHT_FILL = 'rgba(250, 204, 21, 0.4)'; // yellow-300/40
export const BLUR_DEFAULT_RADIUS = 14;
