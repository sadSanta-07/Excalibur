"use client";

import { Minus, Plus, Redo2, Undo2 } from "lucide-react";

interface Props {
  canUndo: boolean;
  canRedo: boolean;
  zoom: number;
  onUndo: () => void;
  onRedo: () => void;
  onZoom: (f: number) => void;
  onReset: () => void;
}

export default function BottomBar({ canUndo, canRedo, zoom, onUndo, onRedo, onZoom, onReset }: Props) {
  return (
    <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2 max-md:bottom-20">
      <div className="island flex items-center p-1">
        <button className="icon-btn" title="Zoom out (Ctrl -)" aria-label="Zoom out" onClick={() => onZoom(1 / 1.2)}><Minus size={16} /></button>
        <button className="h-9 min-w-14 rounded-md px-1 text-sm font-semibold text-ink hover:bg-surface" title="Reset zoom (Ctrl 0)" onClick={onReset}>
          {Math.round(zoom * 100)}%
        </button>
        <button className="icon-btn" title="Zoom in (Ctrl +)" aria-label="Zoom in" onClick={() => onZoom(1.2)}><Plus size={16} /></button>
      </div>
      <div className="island flex items-center p-1">
        <button className="icon-btn" disabled={!canUndo} title="Undo (Ctrl Z)" aria-label="Undo" onClick={onUndo}><Undo2 size={16} /></button>
        <button className="icon-btn" disabled={!canRedo} title="Redo (Ctrl Shift Z)" aria-label="Redo" onClick={onRedo}><Redo2 size={16} /></button>
      </div>
    </div>
  );
}