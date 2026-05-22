import { create } from 'zustand';
import type { Shape, StrokeLevel, Tool } from '@/lib/annotation/types';
import { PALETTE, STROKE_LEVELS } from '@/lib/annotation/types';

const MAX_HISTORY = 100;

interface AnnotationState {
  shapes: Shape[];
  selectedId: string | null;
  tool: Tool;
  color: string;
  strokeWidth: StrokeLevel;
  past: Shape[][];
  future: Shape[][];

  setTool: (tool: Tool) => void;
  setColor: (color: string) => void;
  setStrokeWidth: (w: StrokeLevel) => void;
  selectShape: (id: string | null) => void;

  addShape: (shape: Shape) => void;
  updateShape: (id: string, partial: Partial<Shape>) => void;
  commitChange: (previous: Shape[]) => void;
  deleteShape: (id: string) => void;

  loadShapes: (shapes: Shape[]) => void;
  reset: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

function pushPast(past: Shape[][], snapshot: Shape[]): Shape[][] {
  const next = [...past, snapshot];
  if (next.length > MAX_HISTORY) next.shift();
  return next;
}

export const useAnnotationStore = create<AnnotationState>((set, get) => ({
  shapes: [],
  selectedId: null,
  tool: 'select',
  color: PALETTE[0],
  strokeWidth: STROKE_LEVELS[1],
  past: [],
  future: [],

  setTool: (tool) =>
    set({ tool, selectedId: tool === 'select' ? get().selectedId : null }),
  setColor: (color) => set({ color }),
  setStrokeWidth: (strokeWidth) => set({ strokeWidth }),
  selectShape: (id) => set({ selectedId: id }),

  addShape: (shape) =>
    set((s) => ({
      shapes: [...s.shapes, shape],
      past: pushPast(s.past, s.shapes),
      future: [],
      selectedId: shape.id,
    })),

  updateShape: (id, partial) =>
    set((s) => ({
      shapes: s.shapes.map((sh) =>
        sh.id === id ? ({ ...sh, ...partial } as Shape) : sh,
      ),
    })),

  commitChange: (previous) =>
    set((s) => ({
      past: pushPast(s.past, previous),
      future: [],
    })),

  deleteShape: (id) =>
    set((s) => ({
      shapes: s.shapes.filter((sh) => sh.id !== id),
      past: pushPast(s.past, s.shapes),
      future: [],
      selectedId: null,
    })),

  loadShapes: (shapes) =>
    set({
      shapes,
      past: [],
      future: [],
      selectedId: null,
    }),

  reset: () =>
    set({
      shapes: [],
      past: [],
      future: [],
      selectedId: null,
      tool: 'select',
    }),

  undo: () =>
    set((s) => {
      if (s.past.length === 0) return s;
      const previous = s.past[s.past.length - 1]!;
      return {
        shapes: previous,
        past: s.past.slice(0, -1),
        future: [s.shapes, ...s.future],
        selectedId: null,
      };
    }),

  redo: () =>
    set((s) => {
      if (s.future.length === 0) return s;
      const next = s.future[0]!;
      return {
        shapes: next,
        past: pushPast(s.past, s.shapes),
        future: s.future.slice(1),
        selectedId: null,
      };
    }),

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,
}));

export function nextShapeId(): string {
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function nextNumberIndex(shapes: Shape[]): number {
  let max = 0;
  for (const s of shapes) {
    if (s.type === 'number' && s.index > max) max = s.index;
  }
  return max + 1;
}
