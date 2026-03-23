import React, { useEffect, useRef, useState } from 'react';
import { store, useMeasureStore } from '../store';
import { getCircle, distToSeg, uid, realLengthText } from '../utils/math';

const HANDLE_R = 7;
const HIT_DIST = 8;

export function CanvasArea() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const state = useMeasureStore();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let drag: any = null;
    let isDown = false;
    let spaceDown = false;

    const resizeCanvas = () => {
      const rect = canvas.parentElement!.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    };

    const screenToWorld = (sx: number, sy: number) => {
      const { viewport } = store.state;
      return {
        x: (sx - viewport.ox) / viewport.scale,
        y: (sy - viewport.oy) / viewport.scale
      };
    };

    const worldToScreen = (wx: number, wy: number) => {
      const { viewport } = store.state;
      return {
        x: wx * viewport.scale + viewport.ox,
        y: wy * viewport.scale + viewport.oy
      };
    };

    const draw = () => {
      const { img, viewport, lines, selectedId, mode, mmPerPx, perspectivePoints } = store.state;
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);

      ctx.save();
      ctx.fillStyle = '#08102a';
      ctx.fillRect(0, 0, rect.width, rect.height);
      ctx.restore();

      if (!img) {
        ctx.save();
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.font = '14px system-ui, sans-serif';
        ctx.fillText('Load an image to start (upload / drop / paste).', 18, 26);
        ctx.restore();
        return;
      }

      ctx.save();
      ctx.translate(viewport.ox, viewport.oy);
      ctx.scale(viewport.scale, viewport.scale);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(img, 0, 0);

      for (const l of lines) {
        ctx.save();
        ctx.lineWidth = (l.type === 'scale' ? 3 : 2) / viewport.scale;
        ctx.strokeStyle = l.type === 'scale' ? '#ffcc66' : (l.type === 'radius' ? '#c482ff' : '#33d69f');
        if (l.id === selectedId) ctx.strokeStyle = '#4f8cff';

        if (l.type === 'radius' && l.xm !== undefined && l.ym !== undefined) {
          const c = getCircle(l.x1, l.y1, l.xm, l.ym, l.x2, l.y2);
          if (c) {
            const sa = Math.atan2(l.y1 - c.y, l.x1 - c.x);
            const ma = Math.atan2(l.ym - c.y, l.xm - c.x);
            const ea = Math.atan2(l.y2 - c.y, l.x2 - c.x);
            const norm = (a: number) => (a + 2 * Math.PI) % (2 * Math.PI);
            const isCw = (norm(ma - sa) <= norm(ea - sa));

            ctx.beginPath();
            ctx.arc(c.x, c.y, c.r, sa, ea, !isCw);
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(l.x1, l.y1, 4 / viewport.scale, 0, Math.PI * 2);
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(l.x2, l.y2, 4 / viewport.scale, 0, Math.PI * 2);
            ctx.stroke();
          } else {
            ctx.beginPath(); ctx.moveTo(l.x1, l.y1); ctx.lineTo(l.x2, l.y2); ctx.stroke();

            ctx.beginPath();
            ctx.arc(l.x1, l.y1, 4 / viewport.scale, 0, Math.PI * 2);
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(l.x2, l.y2, 4 / viewport.scale, 0, Math.PI * 2);
            ctx.stroke();
          }
        } else {
          ctx.beginPath();
          ctx.moveTo(l.x1, l.y1);
          ctx.lineTo(l.x2, l.y2);
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(l.x1, l.y1, 4 / viewport.scale, 0, Math.PI * 2);
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(l.x2, l.y2, 4 / viewport.scale, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }

      if (mode === 'perspective' && perspectivePoints && perspectivePoints.length > 0) {
        ctx.save();
        ctx.strokeStyle = '#ff4f81';
        ctx.lineWidth = 2 / viewport.scale;
        ctx.beginPath();
        perspectivePoints.forEach((p, i) => {
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        if (perspectivePoints.length === 4) ctx.closePath();
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 79, 129, 0.2)';
        if (perspectivePoints.length === 4) ctx.fill();
        ctx.restore();
      }

      ctx.restore();

      ctx.save();
      ctx.font = '12px system-ui, sans-serif';
      ctx.textBaseline = 'middle';

      for (const l of lines) {
        const a = worldToScreen(l.x1, l.y1);
        const b = worldToScreen(l.x2, l.y2);

        let lx, ly;
        if (l.type === 'radius' && l.xm !== undefined && l.ym !== undefined) {
          const m = worldToScreen(l.xm, l.ym);
          lx = m.x; ly = m.y - 20;
        } else {
          lx = (a.x + b.x) / 2; ly = (a.y + b.y) / 2;
        }

        const txt = realLengthText(l, mmPerPx);
        ctx.save();
        const pad = 4;
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        const w = ctx.measureText(txt).width;
        ctx.fillRect(lx - w / 2 - pad, ly - 9, w + pad * 2, 18);

        ctx.fillStyle = l.type === 'scale' ? '#ffcc66' : (l.type === 'radius' ? '#c482ff' : '#33d69f');
        if (l.id === selectedId) ctx.fillStyle = '#4f8cff';
        ctx.fillText(txt, lx - w / 2, ly);
        ctx.restore();

        if (l.id === selectedId) {
          ctx.save();
          ctx.strokeStyle = '#4f8cff';
          ctx.lineWidth = 2;

          const drawHandle = (p: { x: number, y: number }) => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, HANDLE_R, 0, Math.PI * 2);
            ctx.stroke();
          };
          drawHandle(a);
          drawHandle(b);
          if (l.type === 'radius' && l.xm !== undefined && l.ym !== undefined) {
            const m = worldToScreen(l.xm, l.ym);
            drawHandle(m);
          }
          ctx.restore();
        }
      }

      if (mode === 'perspective' && perspectivePoints && perspectivePoints.length > 0) {
        ctx.save();
        ctx.strokeStyle = '#ff4f81';
        ctx.lineWidth = 2;
        perspectivePoints.forEach((p) => {
          const sp = worldToScreen(p.x, p.y);
          ctx.beginPath();
          ctx.arc(sp.x, sp.y, HANDLE_R, 0, Math.PI * 2);
          ctx.stroke();
        });
        ctx.restore();
      }

      ctx.fillStyle = 'rgba(255,255,255,0.70)';
      ctx.font = '12px ui-monospace, SFMono-Regular, Consolas, monospace';
      ctx.fillText(`mode=${mode}  zoom=${viewport.scale.toFixed(3)}  lines=${lines.length}`, 12, rect.height - 14);
      ctx.restore();
    };

    const pick = (sx: number, sy: number) => {
      const { lines, selectedId, viewport, mode, perspectivePoints } = store.state;
      
      if (mode === 'perspective') {
        for (let i = 0; i < perspectivePoints.length; i++) {
          const p = worldToScreen(perspectivePoints[i].x, perspectivePoints[i].y);
          if (Math.hypot(sx - p.x, sy - p.y) <= HANDLE_R + 2) return { kind: 'perspective', index: i, id: '' };
        }
      }

      for (let i = lines.length - 1; i >= 0; i--) {
        const l = lines[i];
        const a = worldToScreen(l.x1, l.y1);
        const b = worldToScreen(l.x2, l.y2);

        if (l.id === selectedId) {
          if (Math.hypot(sx - a.x, sy - a.y) <= HANDLE_R + 2) return { id: l.id, kind: 'p1' };
          if (Math.hypot(sx - b.x, sy - b.y) <= HANDLE_R + 2) return { id: l.id, kind: 'p2' };
          if (l.type === 'radius' && l.xm !== undefined && l.ym !== undefined) {
            const m = worldToScreen(l.xm, l.ym);
            if (Math.hypot(sx - m.x, sy - m.y) <= HANDLE_R + 2) return { id: l.id, kind: 'pm' };
          }
        }

        if (l.type === 'radius' && l.xm !== undefined && l.ym !== undefined) {
          const m = worldToScreen(l.xm, l.ym);
          if (distToSeg(sx, sy, a.x, a.y, m.x, m.y) <= HIT_DIST) return { id: l.id, kind: 'body' };
          if (distToSeg(sx, sy, m.x, m.y, b.x, b.y) <= HIT_DIST) return { id: l.id, kind: 'body' };

          const c = getCircle(l.x1, l.y1, l.xm, l.ym, l.x2, l.y2);
          if (c) {
            const sc = worldToScreen(c.x, c.y);
            const sr = c.r * viewport.scale;
            const d = Math.hypot(sx - sc.x, sy - sc.y);
            if (Math.abs(d - sr) <= HIT_DIST) {
              const aAng = Math.atan2(sy - sc.y, sx - sc.x);
              const sa = Math.atan2(a.y - sc.y, a.x - sc.x);
              const ma = Math.atan2(m.y - sc.y, m.x - sc.x);
              const ea = Math.atan2(b.y - sc.y, b.x - sc.x);
              const norm = (val: number) => (val + 2 * Math.PI) % (2 * Math.PI);
              const isCw = (norm(ma - sa) <= norm(ea - sa));
              const isInside = isCw ? (norm(aAng - sa) <= norm(ea - sa)) : (norm(sa - aAng) <= norm(sa - ea));
              if (isInside) return { id: l.id, kind: 'body' };
            }
          }
        } else {
          const d = distToSeg(sx, sy, a.x, a.y, b.x, b.y);
          if (d <= HIT_DIST) return { id: l.id, kind: 'body' };
        }
      }
      return null;
    };

    const getCanvasPoint = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { sx: e.clientX - rect.left, sy: e.clientY - rect.top };
    };

    const onPointerDown = (e: PointerEvent) => {
      canvas.setPointerCapture(e.pointerId);
      const { sx, sy } = getCanvasPoint(e);
      const { mode } = store.state;

      const wantPan = (mode === 'pan') || spaceDown || (e.button === 1) || (e.button === 2);
      const hit = pick(sx, sy);

      if (wantPan) {
        isDown = true;
        drag = { kind: 'pan', lastSx: sx, lastSy: sy };
        return;
      }

      if (hit) {
        if (hit.kind === 'perspective') {
          isDown = true;
          const w = screenToWorld(sx, sy);
          drag = { kind: 'perspective', index: hit.index, lastWx: w.x, lastWy: w.y };
          draw();
          return;
        }
        store.update({ selectedId: hit.id });
        isDown = true;
        const w = screenToWorld(sx, sy);
        drag = { kind: hit.kind, id: hit.id, lastWx: w.x, lastWy: w.y };
        draw();
        return;
      }

      if (mode === 'perspective') {
        if (store.state.perspectivePoints.length < 4) {
          const w = screenToWorld(sx, sy);
          store.update({ perspectivePoints: [...store.state.perspectivePoints, { x: w.x, y: w.y }] });
          draw();
        }
        return;
      }

      if (mode === 'scale' || mode === 'measure' || mode === 'radius') {
        const w = screenToWorld(sx, sy);
        isDown = true;
        drag = { kind: 'new', type: mode };
        
        const id = (mode === 'scale') ? 'SCALE' : uid();
        let newLines = [...store.state.lines];
        let newScaleLineId = store.state.scaleLineId;
        
        if (mode === 'scale') {
          if (newScaleLineId) newLines = newLines.filter(l => l.id !== newScaleLineId);
          newScaleLineId = id;
        }
        
        const l: any = { id, type: mode, x1: w.x, y1: w.y, x2: w.x, y2: w.y };
        if (mode === 'radius') {
          l.xm = w.x; l.ym = w.y;
        }
        newLines.push(l);
        
        store.update({ lines: newLines, selectedId: id, scaleLineId: newScaleLineId });
        draw();
        return;
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const { sx, sy } = getCanvasPoint(e);
      const { mode, lines, selectedId } = store.state;

      if (!isDown || !drag) {
        const hit = pick(sx, sy);
        canvas.style.cursor = hit ? (hit.kind === 'p1' || hit.kind === 'p2' || hit.kind === 'pm' ? 'grab' : 'move') : (mode === 'pan' || spaceDown ? 'grab' : 'crosshair');
        return;
      }

      if (drag.kind === 'pan') {
        store.state.viewport.ox += (sx - drag.lastSx);
        store.state.viewport.oy += (sy - drag.lastSy);
        drag.lastSx = sx; drag.lastSy = sy;
        draw();
        return;
      }

      const w = screenToWorld(sx, sy);

      if (drag.kind === 'perspective') {
        const newPoints = [...store.state.perspectivePoints];
        newPoints[drag.index] = { x: w.x, y: w.y };
        store.update({ perspectivePoints: newPoints });
        draw();
        return;
      }

      const l = lines.find(x => x.id === selectedId);
      if (!l) return;

      if (drag.kind === 'new') {
        l.x2 = w.x; l.y2 = w.y;
        if (l.type === 'radius') {
          l.xm = (l.x1 + l.x2) / 2;
          l.ym = (l.y1 + l.y2) / 2;
        }
      } else if (drag.kind === 'p1') {
        l.x1 = w.x; l.y1 = w.y;
      } else if (drag.kind === 'p2') {
        l.x2 = w.x; l.y2 = w.y;
      } else if (drag.kind === 'pm') {
        l.xm = w.x; l.ym = w.y;
      } else if (drag.kind === 'body') {
        const dx = w.x - drag.lastWx;
        const dy = w.y - drag.lastWy;
        l.x1 += dx; l.y1 += dy;
        l.x2 += dx; l.y2 += dy;
        if (l.type === 'radius' && l.xm !== undefined && l.ym !== undefined) { l.xm += dx; l.ym += dy; }
        drag.lastWx = w.x; drag.lastWy = w.y;
      }

      draw();
    };

    const onPointerUp = () => {
      if (!isDown) return;
      isDown = false;
      drag = null;
      store.update({ lines: [...store.state.lines], viewport: { ...store.state.viewport } });
      draw();
    };

    const onWheel = (e: WheelEvent) => {
      if (!store.state.img) return;
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const factor = Math.pow(1.1, -e.deltaY / 100);
      
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      
      const before = screenToWorld(sx, sy);
      store.state.viewport.scale = Math.max(0.05, Math.min(80, store.state.viewport.scale * factor));
      const after = screenToWorld(sx, sy);
      store.state.viewport.ox += (after.x - before.x) * store.state.viewport.scale;
      store.state.viewport.oy += (after.y - before.y) * store.state.viewport.scale;
      
      store.update({ viewport: { ...store.state.viewport } });
      draw();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ') { spaceDown = true; canvas.style.cursor = 'grab'; }
      if (e.key === 'Delete') store.deleteSelected();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') { e.preventDefault(); store.duplicateSelected(); }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') spaceDown = false;
    };

    const onContextMenu = (e: MouseEvent) => e.preventDefault();

    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('contextmenu', onContextMenu);

    resizeCanvas();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('contextmenu', onContextMenu);
    };
  }, [state.img]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const draw = () => {
      const { img, viewport, lines, selectedId, mode, mmPerPx, perspectivePoints } = store.state;
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);

      ctx.save();
      ctx.fillStyle = '#08102a';
      ctx.fillRect(0, 0, rect.width, rect.height);
      ctx.restore();

      if (!img) {
        ctx.save();
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.font = '14px system-ui, sans-serif';
        ctx.fillText('Load an image to start (upload / drop / paste).', 18, 26);
        ctx.restore();
        return;
      }

      ctx.save();
      ctx.translate(viewport.ox, viewport.oy);
      ctx.scale(viewport.scale, viewport.scale);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(img, 0, 0);

      for (const l of lines) {
        ctx.save();
        ctx.lineWidth = (l.type === 'scale' ? 3 : 2) / viewport.scale;
        ctx.strokeStyle = l.type === 'scale' ? '#ffcc66' : (l.type === 'radius' ? '#c482ff' : '#33d69f');
        if (l.id === selectedId) ctx.strokeStyle = '#4f8cff';

        if (l.type === 'radius' && l.xm !== undefined && l.ym !== undefined) {
          const c = getCircle(l.x1, l.y1, l.xm, l.ym, l.x2, l.y2);
          if (c) {
            const sa = Math.atan2(l.y1 - c.y, l.x1 - c.x);
            const ma = Math.atan2(l.ym - c.y, l.xm - c.x);
            const ea = Math.atan2(l.y2 - c.y, l.x2 - c.x);
            const norm = (a: number) => (a + 2 * Math.PI) % (2 * Math.PI);
            const isCw = (norm(ma - sa) <= norm(ea - sa));

            ctx.beginPath();
            ctx.arc(c.x, c.y, c.r, sa, ea, !isCw);
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(l.x1, l.y1, 4 / viewport.scale, 0, Math.PI * 2);
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(l.x2, l.y2, 4 / viewport.scale, 0, Math.PI * 2);
            ctx.stroke();
          } else {
            ctx.beginPath(); ctx.moveTo(l.x1, l.y1); ctx.lineTo(l.x2, l.y2); ctx.stroke();

            ctx.beginPath();
            ctx.arc(l.x1, l.y1, 4 / viewport.scale, 0, Math.PI * 2);
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(l.x2, l.y2, 4 / viewport.scale, 0, Math.PI * 2);
            ctx.stroke();
          }
        } else {
          ctx.beginPath();
          ctx.moveTo(l.x1, l.y1);
          ctx.lineTo(l.x2, l.y2);
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(l.x1, l.y1, 4 / viewport.scale, 0, Math.PI * 2);
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(l.x2, l.y2, 4 / viewport.scale, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }

      if (mode === 'perspective' && perspectivePoints.length > 0) {
        ctx.save();
        ctx.strokeStyle = '#ff4f81';
        ctx.lineWidth = 2 / viewport.scale;
        ctx.beginPath();
        perspectivePoints.forEach((p, i) => {
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        if (perspectivePoints.length === 4) ctx.closePath();
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 79, 129, 0.2)';
        if (perspectivePoints.length === 4) ctx.fill();
        ctx.restore();
      }

      ctx.restore();

      ctx.save();
      ctx.font = '12px system-ui, sans-serif';
      ctx.textBaseline = 'middle';

      const worldToScreen = (wx: number, wy: number) => {
        return {
          x: wx * viewport.scale + viewport.ox,
          y: wy * viewport.scale + viewport.oy
        };
      };

      for (const l of lines) {
        const a = worldToScreen(l.x1, l.y1);
        const b = worldToScreen(l.x2, l.y2);

        let lx, ly;
        if (l.type === 'radius' && l.xm !== undefined && l.ym !== undefined) {
          const m = worldToScreen(l.xm, l.ym);
          lx = m.x; ly = m.y - 20;
        } else {
          lx = (a.x + b.x) / 2; ly = (a.y + b.y) / 2;
        }

        const txt = realLengthText(l, mmPerPx);
        ctx.save();
        const pad = 4;
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        const w = ctx.measureText(txt).width;
        ctx.fillRect(lx - w / 2 - pad, ly - 9, w + pad * 2, 18);

        ctx.fillStyle = l.type === 'scale' ? '#ffcc66' : (l.type === 'radius' ? '#c482ff' : '#33d69f');
        if (l.id === selectedId) ctx.fillStyle = '#4f8cff';
        ctx.fillText(txt, lx - w / 2, ly);
        ctx.restore();

        if (l.id === selectedId) {
          ctx.save();
          ctx.strokeStyle = '#4f8cff';
          ctx.lineWidth = 2;

          const drawHandle = (p: { x: number, y: number }) => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, HANDLE_R, 0, Math.PI * 2);
            ctx.stroke();
          };
          drawHandle(a);
          drawHandle(b);
          if (l.type === 'radius' && l.xm !== undefined && l.ym !== undefined) {
            const m = worldToScreen(l.xm, l.ym);
            drawHandle(m);
          }
          ctx.restore();
        }
      }

      if (mode === 'perspective' && perspectivePoints.length > 0) {
        ctx.save();
        ctx.strokeStyle = '#ff4f81';
        ctx.lineWidth = 2;
        perspectivePoints.forEach((p) => {
          const sp = worldToScreen(p.x, p.y);
          ctx.beginPath();
          ctx.arc(sp.x, sp.y, HANDLE_R, 0, Math.PI * 2);
          ctx.stroke();
        });
        ctx.restore();
      }

      ctx.fillStyle = 'rgba(255,255,255,0.70)';
      ctx.font = '12px ui-monospace, SFMono-Regular, Consolas, monospace';
      ctx.fillText(`mode=${mode}  zoom=${viewport.scale.toFixed(3)}  lines=${lines.length}`, 12, rect.height - 14);
      ctx.restore();
    };
    
    draw();
  });

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const f = e.dataTransfer?.files?.[0];
    if (f && f.type.startsWith('image/')) store.loadImage(f);
  };

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const it of items) {
        if (it.type && it.type.startsWith('image/')) {
          const blob = it.getAsFile();
          if (blob) store.loadImageFromBlob(blob);
          break;
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  return (
    <main 
      className="relative overflow-hidden w-full h-full"
      onDragEnter={handleDragOver}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <canvas ref={canvasRef} id="canvas" className="block w-full h-full touch-none" />
      {isDraggingOver && (
        <div className="absolute inset-0 grid place-items-center bg-black/55 border-2 border-dashed border-white/25 text-white font-semibold z-10 pointer-events-none">
          Drop image file here
        </div>
      )}
    </main>
  );
}
