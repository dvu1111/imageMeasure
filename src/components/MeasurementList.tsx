import React from 'react';
import { store, useMeasureStore } from '../store';
import { realLengthText } from '../utils/math';

export function MeasurementList() {
  const { lines, selectedId, mmPerPx } = useMeasureStore();

  const ordered = [...lines].sort((a, b) => (a.type === b.type ? 0 : (a.type === 'scale' ? -1 : 1)));

  return (
    <ul className="flex flex-col gap-2 m-0 p-0 list-none">
      {ordered.map(l => (
        <li 
          key={l.id}
          className={`grid grid-cols-[1fr_auto] gap-1.5 p-2.5 border rounded-xl cursor-pointer transition-colors ${
            l.id === selectedId 
              ? 'border-[#4f8cff]/70 bg-[#4f8cff]/10 outline outline-2 outline-[#4f8cff]/50' 
              : 'border-[#223058] bg-[#0f1730]/60 hover:bg-[#16244a]/60'
          }`}
          onClick={() => store.update({ selectedId: l.id })}
        >
          <div className="text-[13px] text-[#e7eefc] font-medium">
            {l.id} — {realLengthText(l, mmPerPx)}
          </div>
          <div className={`text-[11px] px-2 py-0.5 rounded-full border self-start justify-self-end ${
            l.type === 'scale' ? 'border-[#ffcc66]/45 text-[#ffcc66]' :
            l.type === 'radius' ? 'border-[#c482ff]/45 text-[#c482ff]' :
            'border-[#33d69f]/45 text-[#33d69f]'
          }`}>
            {l.type.toUpperCase()}
          </div>
          <div className="text-xs text-[#9fb2da] col-span-2 font-mono">
            [{l.x1.toFixed(1)}, {l.y1.toFixed(1)}] → [{l.x2.toFixed(1)}, {l.y2.toFixed(1)}]
          </div>
        </li>
      ))}
      {ordered.length === 0 && (
        <div className="text-xs text-[#9fb2da] text-center py-4">No measurements yet.</div>
      )}
    </ul>
  );
}
