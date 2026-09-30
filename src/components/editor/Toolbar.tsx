"use client";

import { ArrowUpRight, Circle, Diamond, Eraser, Hand, Lock, Minus, MousePointer2, Pencil, Square, Type, Workflow, type LucideIcon } from "lucide-react";
import type { Tool } from "@/hooks/useFabricEditor";

const TOOLS: { id: Tool; label: string; key: string; icon: LucideIcon }[] = [
  { id: "hand", label: "Hand (panning)", key: "H", icon: Hand },
  { id: "select", label: "Selection", key: "V", icon: MousePointer2 },
  { id: "rect", label: "Rectangle", key: "R", icon: Square },
  { id: "diamond", label: "Diamond", key: "D", icon: Diamond },
  { id: "ellipse", label: "Ellipse", key: "O", icon: Circle },
  { id: "arrow", label: "Arrow", key: "A", icon: ArrowUpRight },
  { id: "line", label: "Line", key: "L", icon: Minus },
  { id: "pen", label: "Draw", key: "P", icon: Pencil },
  { id: "text", label: "Text", key: "T", icon: Type },
  { id: "eraser", label: "Eraser", key: "E", icon: Eraser },
];

interface Props {
  tool: Tool;
  setTool: (t: Tool) => void;
  locked: boolean;
  onToggleLock: () => void;
  onMermaid: () => void;
}

export default function Toolbar({ tool, setTool, locked, onToggleLock, onMermaid }: Props) {
  return (
    <div
      onMouseDown={(e) => e.preventDefault()}
      className="island absolute left-1/2 top-4 z-20 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-0.5 overflow-x-auto p-1 max-md:bottom-4 max-md:top-auto"
    >
      <button className="icon-btn" data-active={locked} onClick={onToggleLock} title="Keep selected tool active after drawing (Q)" aria-label="Lock tool">
        <Lock size={16} />
      </button>
      <div className="divider" />
      {TOOLS.map((t) => (
        <button
          key={t.id}
          className="icon-btn"
          data-active={tool === t.id}
          onClick={() => setTool(t.id)}
          title={`${t.label} — ${t.key}`}
          aria-label={t.label}
          aria-pressed={tool === t.id}
        >
          <t.icon size={18} />
          <span className="key-hint">{t.key}</span>
        </button>
      ))}
      <div className="divider" />
      <button className="icon-btn" onClick={onMermaid} title="Mermaid to diagram" aria-label="Mermaid to diagram">
        <Workflow size={18} />
      </button>
    </div>
  );
}