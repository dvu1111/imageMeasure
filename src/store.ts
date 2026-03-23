import { useSyncExternalStore } from 'react';
import { Line, Viewport, Mode } from './types';
import { uid, getLineValPx } from './utils/math';

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
    imgName: '',
    viewport: { scale: 1, ox: 0, oy: 0 } as Viewport,
    mode: 'scale' as Mode,
    lines: [] as Line[],
    scaleLineId: null as string | null,
    mmPerPx: null as number | null,
    selectedId: null as string | null,
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
        imgName: file.name || 'image',
        lines: [],
        scaleLineId: null,
        mmPerPx: null,
        selectedId: null,
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
        imgName: name,
        lines: [],
        scaleLineId: null,
        mmPerPx: null,
        selectedId: null,
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
}

export const store = new MeasureStore();

export const useMeasureStore = () => {
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
};
