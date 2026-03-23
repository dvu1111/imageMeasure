import React, { useState, useEffect } from 'react';
import { store, useMeasureStore } from '../store';
import { getLineValPx, realLengthText, getCircle } from '../utils/math';
import { MeasurementList } from './MeasurementList';
import { Ruler, Circle, Move, Trash2, Copy, Download, Upload, Maximize, ZoomIn, FileImage, Crop, RotateCcw, Menu, X, Minimize } from 'lucide-react';

export function Sidebar() {
  const state = useMeasureStore();
  const [knownMm, setKnownMm] = useState<string>('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.error(err));
    } else {
      document.exitFullscreen();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) store.loadImage(f);
  };

  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const txt = await f.text();
    try {
      const payload = JSON.parse(txt);
      if (!payload || !Array.isArray(payload.lines)) return;
      store.update({
        mmPerPx: payload.mmPerPx ?? null,
        scaleLineId: payload.scaleLineId ?? null,
        lines: payload.lines.map((l: any) => ({
          id: String(l.id || Math.random().toString(36).slice(2,8).toUpperCase()),
          type: l.type === 'scale' ? 'scale' : (l.type === 'radius' ? 'radius' : 'measure'),
          x1: +l.x1, y1: +l.y1, x2: +l.x2, y2: +l.y2,
          ...(l.type === 'radius' ? { xm: +l.xm, ym: +l.ym } : {})
        })),
        selectedId: null,
      });
    } catch (err) {
      console.error('Failed to parse JSON', err);
    }
  };

  const exportSessionJson = () => {
    const payload = { version: 1, imgName: state.imgName, mmPerPx: state.mmPerPx, scaleLineId: state.scaleLineId, lines: state.lines };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'measure_session.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const exportAnnotatedPng = () => {
    const canvas = document.getElementById('canvas') as HTMLCanvasElement;
    if (!canvas || !state.img) return;
    const off = document.createElement('canvas');
    off.width = state.img.width; off.height = state.img.height;
    const o = off.getContext('2d');
    if (!o) return;
    o.drawImage(state.img, 0, 0);
    
    for (const l of state.lines) {
      o.save();
      o.lineWidth = (l.type === 'scale' ? 4 : 3);
      o.strokeStyle = l.type === 'scale' ? '#ffcc66' : (l.type === 'radius' ? '#c482ff' : '#33d69f');
      
      if (l.type === 'radius' && l.xm !== undefined && l.ym !== undefined) {
        const c = getCircle(l.x1, l.y1, l.xm, l.ym, l.x2, l.y2);
        if (c) {
          const sa = Math.atan2(l.y1 - c.y, l.x1 - c.x);
          const ma = Math.atan2(l.ym - c.y, l.xm - c.x);
          const ea = Math.atan2(l.y2 - c.y, l.x2 - c.x);
          const norm = (val: number) => (val + 2*Math.PI) % (2*Math.PI);
          const isCw = (norm(ma - sa) <= norm(ea - sa));
          o.beginPath(); o.arc(c.x, c.y, c.r, sa, ea, !isCw); o.stroke();
          o.beginPath(); o.arc(l.x1, l.y1, 6, 0, Math.PI * 2); o.stroke();
          o.beginPath(); o.arc(l.x2, l.y2, 6, 0, Math.PI * 2); o.stroke();
        } else {
          o.beginPath(); o.moveTo(l.x1, l.y1); o.lineTo(l.x2, l.y2); o.stroke();
          o.beginPath(); o.arc(l.x1, l.y1, 6, 0, Math.PI * 2); o.stroke();
          o.beginPath(); o.arc(l.x2, l.y2, 6, 0, Math.PI * 2); o.stroke();
        }
      } else {
        o.beginPath(); o.moveTo(l.x1, l.y1); o.lineTo(l.x2, l.y2); o.stroke();
        o.beginPath(); o.arc(l.x1, l.y1, 6, 0, Math.PI * 2); o.stroke();
        o.beginPath(); o.arc(l.x2, l.y2, 6, 0, Math.PI * 2); o.stroke();
      }
      o.restore();

      let lx, ly;
      if (l.type === 'radius' && l.xm !== undefined && l.ym !== undefined) {
         lx = l.xm; ly = l.ym - 20; 
      } else {
         lx = (l.x1+l.x2)/2; ly = (l.y1+l.y2)/2;
      }
      const txt = realLengthText(l, state.mmPerPx);
      o.save();
      o.font = '18px system-ui, sans-serif';
      const w = o.measureText(txt).width;
      o.fillStyle = 'rgba(0,0,0,0.55)';
      o.fillRect(lx - w/2 - 6, ly - 14, w + 12, 28);
      o.fillStyle = l.type === 'scale' ? '#ffcc66' : (l.type === 'radius' ? '#c482ff' : '#33d69f');
      o.fillText(txt, lx - w/2, ly + 6);
      o.restore();
    }

    off.toBlob(blob => {
      if (!blob) return;
      const base = (state.imgName || 'image').replace(/\.[^.]+$/, '');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${base}_annotated.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    }, 'image/png');
  };

  const scaleLine = state.scaleLineId ? state.lines.find(l => l.id === state.scaleLineId) : null;
  const selectedLine = state.selectedId ? state.lines.find(l => l.id === state.selectedId) : null;

  return (
    <>
      {/* Mobile FAB */}
      <button 
        className="md:hidden fixed bottom-4 right-4 z-40 bg-[#4f8cff] text-[#06102a] p-3 rounded-full shadow-lg flex items-center justify-center min-h-[56px] min-w-[56px]"
        onClick={() => setIsMobileMenuOpen(true)}
      >
        <Menu size={24} />
      </button>

      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside className={`w-4/5 max-w-[340px] md:w-[340px] flex-shrink-0 bg-gradient-to-b from-[#111a33] to-[#0f1730] border-r border-[#223058] overflow-y-auto flex flex-col h-full text-[#e7eefc] fixed md:relative z-50 transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-3 border-b border-[#223058] sticky top-0 bg-[#111a33]/90 backdrop-blur-md z-10 flex flex-col gap-2.5">
          <div className="flex justify-between items-center">
            <h3 className="text-xs tracking-widest uppercase text-[#9fb2da]">Tools</h3>
            <div className="flex gap-2">
              <button className="md:hidden text-[#9fb2da] hover:text-white p-1" onClick={() => setIsMobileMenuOpen(false)}>
                <X size={20} />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 md:flex md:flex-wrap gap-2">
            <button className={`btn-icon w-full md:w-auto ${state.mode === 'scale' ? 'active' : ''}`} onClick={() => store.setMode('scale')} title="Scale">
              <Ruler size={20} /> <span className="md:hidden ml-2">Scale</span>
            </button>
            <button className={`btn-icon w-full md:w-auto ${state.mode === 'measure' ? 'active' : ''}`} onClick={() => store.setMode('measure')} title="Measure">
              <Move size={20} className="rotate-45" /> <span className="md:hidden ml-2">Measure</span>
            </button>
            <button className={`btn-icon w-full md:w-auto ${state.mode === 'radius' ? 'active' : ''}`} onClick={() => store.setMode('radius')} title="Radius">
              <Circle size={20} /> <span className="md:hidden ml-2">Radius</span>
            </button>
            <button className={`btn-icon w-full md:w-auto ${state.mode === 'perspective' ? 'active' : ''}`} onClick={() => store.setMode('perspective')} title="Perspective">
              <Crop size={20} /> <span className="md:hidden ml-2">Perspective</span>
            </button>
            <button className={`btn-icon w-full md:w-auto ${state.mode === 'pan' ? 'active' : ''}`} onClick={() => store.setMode('pan')} title="Pan">
              <Move size={20} /> <span className="md:hidden ml-2">Pan</span>
            </button>
          </div>
        </div>

      {state.mode === 'perspective' && (
        <div className="p-3 border-b border-[#223058]">
          <h3 className="text-xs tracking-widest uppercase text-[#9fb2da] mb-2.5">Perspective Correction</h3>
          <div className="flex flex-col gap-2">
            <div className="text-xs text-[#9fb2da] leading-relaxed">
              Click 4 points (Top-Left, Top-Right, Bottom-Right, Bottom-Left) to define the corners.
            </div>
            <button 
              className="btn flex-1 justify-center disabled:opacity-50 disabled:cursor-not-allowed" 
              disabled={state.perspectivePoints.length !== 4}
              onClick={() => store.applyPerspectiveCorrection()}
            >
              Apply Warp
            </button>
          </div>
        </div>
      )}

      <div className="p-3 border-b border-[#223058]">
        <h3 className="text-xs tracking-widest uppercase text-[#9fb2da] mb-2.5">Image</h3>
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <label className="flex-1 flex items-center gap-2 px-3 py-2 bg-[#0f1730] border border-[#223058] rounded-lg cursor-pointer hover:bg-[#16244a] transition-colors min-h-[44px]">
              <FileImage size={20} className="text-[#9fb2da]" />
              <span className="text-sm text-[#9fb2da] truncate">{state.imgName || 'Choose image...'}</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </label>
            <button className="btn-icon ml-2 flex-none" onClick={toggleFullscreen} title="Toggle Fullscreen">
              {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>
          </div>
          <div className="flex gap-2">
            <button className="btn flex-1" onClick={() => store.fitToScreen()}><Maximize size={18} className="inline mr-1"/> Fit</button>
            <button className="btn flex-1" onClick={() => store.oneToOne()}><ZoomIn size={18} className="inline mr-1"/> 1:1</button>
            <button className="btn-danger flex-1" onClick={() => store.clearAll()}><Trash2 size={18} className="inline mr-1"/> Clear</button>
          </div>
          {state.originalImg && (
            <div className="flex gap-2">
              <button className="btn flex-1 justify-center" onClick={() => store.resetImage()}><RotateCcw size={18} className="inline mr-1"/> Reset to Original</button>
            </div>
          )}
          <div className="text-xs text-[#9fb2da] leading-relaxed mt-1">
            Drag-drop an image onto the canvas. Paste (Ctrl+V) also works.
          </div>
        </div>
      </div>

      <div className="p-3 border-b border-[#223058]">
        <h3 className="text-xs tracking-widest uppercase text-[#9fb2da] mb-2.5">Scale (mm)</h3>
        <div className="flex flex-col gap-2">
          <div>
            <label className="text-xs text-[#9fb2da] block mb-1">Known length of scale line (mm)</label>
            <input 
              type="number" 
              min="0" 
              step="0.01" 
              placeholder="e.g. 50" 
              className="w-full px-2.5 py-2 rounded-lg border border-[#223058] bg-[#0f1730] text-[#e7eefc] outline-none focus:border-[#4f8cff]"
              value={knownMm}
              onChange={e => setKnownMm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button className="btn flex-1" onClick={() => store.applyScale(parseFloat(knownMm))}>Apply</button>
            <button className="btn-danger-solid flex-1" onClick={() => store.clearScale()}>Clear</button>
          </div>
          <div className="text-xs text-[#9fb2da] mt-1">
            {scaleLine && state.mmPerPx ? (
              <>Scale set: <b className="text-[#e7eefc]">{(1/state.mmPerPx).toFixed(4)}</b> px/mm ( <b className="text-[#e7eefc]">{state.mmPerPx.toFixed(6)}</b> mm/px )</>
            ) : 'No scale set.'}
          </div>
        </div>
      </div>

      <div className="p-3 border-b border-[#223058]">
        <h3 className="text-xs tracking-widest uppercase text-[#9fb2da] mb-2.5">Selection</h3>
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <button className="btn-danger flex-1" onClick={() => store.deleteSelected()}><Trash2 size={18} className="inline mr-1"/> Delete</button>
            <button className="btn flex-1" onClick={() => store.duplicateSelected()}><Copy size={18} className="inline mr-1"/> Duplicate</button>
          </div>
          <div className="text-xs text-[#9fb2da] mt-1">
            {selectedLine ? (
              <>Selected: <b className="text-[#e7eefc]">{selectedLine.type.toUpperCase()}</b> {selectedLine.id} — <b className="text-[#e7eefc]">{realLengthText(selectedLine, state.mmPerPx)}</b></>
            ) : 'None selected.'}
          </div>
        </div>
      </div>

      <div className="p-3 border-b border-[#223058] flex-1 overflow-y-auto">
        <h3 className="text-xs tracking-widest uppercase text-[#9fb2da] mb-2.5">Measurements</h3>
        <MeasurementList />
      </div>

      <div className="p-3 border-t border-[#223058]">
        <h3 className="text-xs tracking-widest uppercase text-[#9fb2da] mb-2.5">Export / Import</h3>
        <div className="flex flex-col gap-2">
          <button className="btn w-full justify-center" onClick={exportAnnotatedPng}><Download size={18} className="inline mr-2"/> Export PNG</button>
          <button className="btn w-full justify-center" onClick={exportSessionJson}><Download size={18} className="inline mr-2"/> Export JSON</button>
          <label className="btn w-full justify-center cursor-pointer flex items-center">
            <Upload size={18} className="inline mr-2"/> Import JSON
            <input type="file" accept="application/json" className="hidden" onChange={handleImportJson} />
          </label>
        </div>
      </div>
    </aside>
    </>
  );
}
