import { useSyncExternalStore } from 'react';
import { Line, Viewport, Mode, Point } from './types';
import { uid, getLineValPx, solveHomography, applyHomography } from './utils/math';

class MeasureStore {
  private listeners = new Set<() => void>();

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  notify = () => {
    this.listeners.forEach(l => l());
  };

  state = {
    img: null as HTMLImageElement | null,
    originalImg: null as HTMLImageElement | null,
    imgName: '',
    viewport: { scale: 1, ox: 0, oy: 0 } as Viewport,
    mode: 'scale' as Mode,
    lines: [] as Line[],
    scaleLineId: null as string | null,
    mmPerPx: null as number | null,
    selectedId: null as string | null,
    perspectivePoints: [] as Point[],
  };

  getSnapshot = () => this.state;

  update(partial: Partial<typeof this.state>) {
    this.state = { ...this.state, ...partial };
    this.notify();
  }

  setMode(mode: Mode) {
    this.update({ mode });
  }

  loadImage(file: File) {
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => {
      this.update({
        img: im,
        originalImg: im,
        imgName: file.name || 'image',
        lines: [],
        scaleLineId: null,
        mmPerPx: null,
        selectedId: null,
        perspectivePoints: [],
      });
      this.fitToScreen();
      URL.revokeObjectURL(url);
    };
    im.src = url;
  }

  loadImageFromBlob(blob: Blob, name = 'pasted-image.png') {
    const url = URL.createObjectURL(blob);
    const im = new Image();
    im.onload = () => {
      this.update({
        img: im,
        originalImg: im,
        imgName: name,
        lines: [],
        scaleLineId: null,
        mmPerPx: null,
        selectedId: null,
        perspectivePoints: [],
      });
      this.fitToScreen();
      URL.revokeObjectURL(url);
    };
    im.src = url;
  }

  fitToScreen() {
    const { img } = this.state;
    if (!img) return;
    const canvas = document.getElementById('canvas') as HTMLCanvasElement;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const margin = 20;
    const sx = (rect.width - margin * 2) / img.width;
    const sy = (rect.height - margin * 2) / img.height;
    const scale = Math.max(0.05, Math.min(50, Math.min(sx, sy)));
    const ox = margin + (rect.width - margin * 2 - img.width * scale) / 2;
    const oy = margin + (rect.height - margin * 2 - img.height * scale) / 2;
    this.update({ viewport: { scale, ox, oy } });
  }

  oneToOne() {
    if (!this.state.img) return;
    this.update({ viewport: { scale: 1, ox: 10, oy: 10 } });
  }

  clearAll() {
    this.update({
      lines: [],
      selectedId: null,
      scaleLineId: null,
      mmPerPx: null,
    });
  }

  deleteSelected() {
    const { selectedId, lines, scaleLineId } = this.state;
    if (!selectedId) return;
    const newLines = lines.filter(l => l.id !== selectedId);
    let newScaleLineId = scaleLineId;
    let newMmPerPx = this.state.mmPerPx;
    if (selectedId === scaleLineId) {
      newScaleLineId = null;
      newMmPerPx = null;
    }
    this.update({
      lines: newLines,
      selectedId: null,
      scaleLineId: newScaleLineId,
      mmPerPx: newMmPerPx,
    });
  }

  duplicateSelected() {
    const { selectedId, lines } = this.state;
    if (!selectedId) return;
    const l = lines.find(x => x.id === selectedId);
    if (!l) return;
    const copy = { ...l, id: uid(), x1: l.x1 + 10, y1: l.y1 + 10, x2: l.x2 + 10, y2: l.y2 + 10 };
    if (copy.type === 'radius' && copy.xm !== undefined && copy.ym !== undefined) {
      copy.xm += 10;
      copy.ym += 10;
    }
    if (copy.type === 'scale') copy.type = 'measure';
    this.update({
      lines: [...lines, copy],
      selectedId: copy.id,
    });
  }

  applyScale(knownMm: number) {
    const { scaleLineId, lines } = this.state;
    if (!scaleLineId || knownMm <= 0) return;
    const l = lines.find(x => x.id === scaleLineId);
    if (!l) return;
    const px = getLineValPx(l);
    if (px <= 0 || !isFinite(px)) return;
    this.update({ mmPerPx: knownMm / px });
  }

  clearScale() {
    const { scaleLineId, lines } = this.state;
    this.update({
      lines: scaleLineId ? lines.filter(l => l.id !== scaleLineId) : lines,
      scaleLineId: null,
      mmPerPx: null,
    });
  }

  resetImage() {
    const { originalImg } = this.state;
    if (!originalImg) return;
    this.update({
      img: originalImg,
      lines: [],
      scaleLineId: null,
      mmPerPx: null,
      selectedId: null,
      perspectivePoints: [],
    });
    this.fitToScreen();
  }

  applyPerspectiveCorrection() {
    const { img, perspectivePoints } = this.state;
    if (!img || perspectivePoints.length !== 4) return;

    const [p0, p1, p2, p3] = perspectivePoints;
    const w1 = Math.hypot(p1.x - p0.x, p1.y - p0.y);
    const w2 = Math.hypot(p2.x - p3.x, p2.y - p3.y);
    const h1 = Math.hypot(p3.x - p0.x, p3.y - p0.y);
    const h2 = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const w = Math.round(Math.max(w1, w2));
    const h = Math.round(Math.max(h1, h2));

    const dstPoints = [
      { x: 0, y: 0 },
      { x: w, y: 0 },
      { x: w, y: h },
      { x: 0, y: h }
    ];

    const H = solveHomography(dstPoints, perspectivePoints);

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    
    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = img.width;
    srcCanvas.height = img.height;
    const srcCtx = srcCanvas.getContext('2d')!;
    srcCtx.drawImage(img, 0, 0);
    const srcData = srcCtx.getImageData(0, 0, img.width, img.height);
    const dstData = ctx.createImageData(w, h);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const p = applyHomography(H, x, y);
        const sx = Math.round(p.x);
        const sy = Math.round(p.y);
        if (sx >= 0 && sx < img.width && sy >= 0 && sy < img.height) {
          const srcIdx = (sy * img.width + sx) * 4;
          const dstIdx = (y * w + x) * 4;
          dstData.data[dstIdx] = srcData.data[srcIdx];
          dstData.data[dstIdx + 1] = srcData.data[srcIdx + 1];
          dstData.data[dstIdx + 2] = srcData.data[srcIdx + 2];
          dstData.data[dstIdx + 3] = srcData.data[srcIdx + 3];
        }
      }
    }
    ctx.putImageData(dstData, 0, 0);

    const newImg = new Image();
    newImg.onload = () => {
      this.update({
        img: newImg,
        perspectivePoints: [],
        lines: [],
        scaleLineId: null,
        mmPerPx: null,
        selectedId: null,
      });
      this.fitToScreen();
    };
    newImg.src = canvas.toDataURL();
  }
}

export const store = new MeasureStore();

export const useMeasureStore = () => {
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
};
