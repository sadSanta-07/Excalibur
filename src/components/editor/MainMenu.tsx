"use client";

import { useState } from "react";
import { Download, FolderOpen, Keyboard, Menu, Moon, Save, Sun, Trash2, Workflow } from "lucide-react";
import { setTheme, useTheme } from "@/lib/theme";

interface Props {
  onSave: () => void;
  onExport: () => void;
  onMermaid: () => void;
  onHelp: () => void;
  onReset: () => void;
  onHome: () => void;
}

export default function MainMenu(p: Props) {
  const [open, setOpen] = useState(false);
  const { theme } = useTheme();
  const run = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };

  return (
    <div className="relative">
      <div className="island p-1">
        <button className="icon-btn" data-active={open} onClick={() => setOpen((o) => !o)} aria-label="Menu" aria-expanded={open}>
          <Menu size={18} />
        </button>
      </div>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onMouseDown={() => setOpen(false)} />
          <div className="island pop absolute left-0 top-full z-40 mt-2 w-64 p-1.5">
            <button className="menu-item" onClick={run(p.onHome)}><FolderOpen size={16} /> All canvases</button>
            <button className="menu-item" onClick={run(p.onSave)}><Save size={16} /> Save <span className="kbd">Ctrl+S</span></button>
            <button className="menu-item" onClick={run(p.onExport)}><Download size={16} /> Export as PNG</button>
            <button className="menu-item" onClick={run(p.onMermaid)}><Workflow size={16} /> Mermaid to diagram</button>
            <button className="menu-item" onClick={run(p.onHelp)}><Keyboard size={16} /> Keyboard shortcuts <span className="kbd">?</span></button>
            <button className="menu-item danger" onClick={run(p.onReset)}><Trash2 size={16} /> Reset the canvas</button>
            <div className="my-1.5 h-px bg-line" />
            <div className="flex items-center justify-between px-3 py-1.5 text-sm">
              <span>Theme</span>
              <div className="flex gap-1 rounded-lg bg-surface p-0.5">
                <button className="icon-btn sm" data-active={theme === "light"} onClick={() => setTheme("light")} aria-label="Light theme"><Sun size={15} /></button>
                <button className="icon-btn sm" data-active={theme === "dark"} onClick={() => setTheme("dark")} aria-label="Dark theme"><Moon size={15} /></button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}