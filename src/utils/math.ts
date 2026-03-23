import { Line } from '../types';

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export const dist2 = (ax: number, ay: number, bx: number, by: number) => {
  const dx = ax - bx, dy = ay - by;
  return dx * dx + dy * dy;
};

export const distToSeg = (px: number, py: number, ax: number, ay: number, bx: number, by: number) => {
  const vx = bx - ax, vy = by - ay;
  const wx = px - ax, wy = py - ay;
  const c1 = vx * wx + vy * wy;
  if (c1 <= 0) return Math.sqrt(dist2(px, py, ax, ay));
  const c2 = vx * vx + vy * vy;
  if (c2 <= c1) return Math.sqrt(dist2(px, py, bx, by));
  const t = c1 / c2;
  const hx = ax + t * vx, hy = ay + t * vy;
  return Math.sqrt(dist2(px, py, hx, hy));
};

export const getCircle = (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) => {
  const ax = x1, ay = y1;
  const bx = x2, by = y2;
  const cx = x3, cy = y3;
  const D = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
  if (Math.abs(D) < 0.0001) return null; // Collinear
  const aSq = ax * ax + ay * ay;
  const bSq = bx * bx + by * by;
  const cSq = cx * cx + cy * cy;
  const ccx = (aSq * (by - cy) + bSq * (cy - ay) + cSq * (ay - by)) / D;
  const ccy = (aSq * (cx - bx) + bSq * (ax - cx) + cSq * (bx - ax)) / D;
  const r = Math.hypot(ax - ccx, ay - ccy);
  return { x: ccx, y: ccy, r };
};

export const uid = () => Math.random().toString(36).slice(2, 8).toUpperCase();

export const getLineValPx = (l: Line) => {
  if (l.type === 'radius' && l.xm !== undefined && l.ym !== undefined) {
    const c = getCircle(l.x1, l.y1, l.xm, l.ym, l.x2, l.y2);
    return c ? c.r : Infinity;
  }
  return Math.hypot(l.x2 - l.x1, l.y2 - l.y1);
};

export const realLengthText = (l: Line, mmPerPx: number | null) => {
  const px = getLineValPx(l);
  const isRad = l.type === 'radius';
  const prefix = isRad ? 'R: ' : '';
  if (px === Infinity) return `${prefix}∞ px`;

  if (mmPerPx && isFinite(mmPerPx)) {
    const mm = px * mmPerPx;
    return `${prefix}${mm.toFixed(2)} mm`;
  }
  return `${prefix}${px.toFixed(1)} px`;
};

export const solveHomography = (src: {x: number, y: number}[], dst: {x: number, y: number}[]) => {
  const A: number[][] = [];
  const B: number[] = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = src[i];
    const { x: u, y: v } = dst[i];
    A.push([x, y, 1, 0, 0, 0, -x * u, -y * u]);
    B.push(u);
    A.push([0, 0, 0, x, y, 1, -x * v, -y * v]);
    B.push(v);
  }
  for (let i = 0; i < 8; i++) {
    let maxRow = i;
    for (let j = i + 1; j < 8; j++) {
      if (Math.abs(A[j][i]) > Math.abs(A[maxRow][i])) maxRow = j;
    }
    const tempA = A[i]; A[i] = A[maxRow]; A[maxRow] = tempA;
    const tempB = B[i]; B[i] = B[maxRow]; B[maxRow] = tempB;
    for (let j = i + 1; j < 8; j++) {
      const f = A[j][i] / A[i][i];
      for (let k = i; k < 8; k++) A[j][k] -= A[i][k] * f;
      B[j] -= B[i] * f;
    }
  }
  const H = new Array(8);
  for (let i = 7; i >= 0; i--) {
    let sum = 0;
    for (let j = i + 1; j < 8; j++) sum += A[i][j] * H[j];
    H[i] = (B[i] - sum) / A[i][i];
  }
  return [...H, 1];
};

export const applyHomography = (H: number[], x: number, y: number) => {
  const w = H[6] * x + H[7] * y + H[8];
  return {
    x: (H[0] * x + H[1] * y + H[2]) / w,
    y: (H[3] * x + H[4] * y + H[5]) / w
  };
};
