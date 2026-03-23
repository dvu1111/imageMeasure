/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Sidebar } from './components/Sidebar';
import { CanvasArea } from './components/CanvasArea';

export default function App() {
  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-[#0b1020] text-[#e7eefc] relative">
      <Sidebar />
      <CanvasArea />
    </div>
  );
}
