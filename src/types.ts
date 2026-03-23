export type Mode = 'scale' | 'measure' | 'radius' | 'pan';

export interface Line {
  id: string;
  type: 'scale' | 'measure' | 'radius';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  xm?: number;
  ym?: number;
}

export interface Viewport {
  scale: number;
  ox: number;
  oy: number;
}
