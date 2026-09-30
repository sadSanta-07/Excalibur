"use client";

import { useEffect, useRef } from "react";
import type { Tool } from "./useFabricEditor";

export interface ShortcutHandlers {
  undo: () => void;
  redo: () => void;
  save: () => void;
  duplicate: () => void;
  remove: () => void;
  deselect: () => void;
  setTool: (t: Tool) => void;
  addRect: () => void;
  addCircle: () => void;
  addText: () => void;
  setPanMode: (on: boolean) => void;
  zoomBy: (f: number) => void;
  resetView: () => void;
}

export function useShortcuts(handlers: ShortcutHandlers) {
  const ref = useRef(handlers);
  useEffect(() => {
    ref.current = handlers;
  });

  useEffect(() => {
    const isTyping = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      return !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
    };

    const onDown = (e: KeyboardEvent) => {
      if (isTyping(e)) return;
      const h = ref.current;
      const k = e.key.toLowerCase();
      const mod = e.ctrlKey || e.metaKey;

      if (mod) {
        if (k === "z") { e.preventDefault(); if (e.shiftKey) h.redo(); else h.undo(); }
        else if (k === "y") { e.preventDefault(); h.redo(); }
        else if (k === "s") { e.preventDefault(); h.save(); }
        else if (k === "d") { e.preventDefault(); h.duplicate(); }
        else if (k === "0") { e.preventDefault(); h.resetView(); }
        else if (k === "=" || k === "+") { e.preventDefault(); h.zoomBy(1.2); }
        else if (k === "-") { e.preventDefault(); h.zoomBy(1 / 1.2); }
        return;
      }

      switch (k) {
        case "delete":
        case "backspace": e.preventDefault(); h.remove(); break;
        case "v": e.preventDefault(); h.setTool("select"); break;
        case "p": e.preventDefault(); h.setTool("pen"); break;
        case "r": e.preventDefault(); h.addRect(); break;
        case "c": e.preventDefault(); h.addCircle(); break;
        case "t": e.preventDefault(); h.addText(); break;
        case "escape": h.deselect(); break;
        case " ": e.preventDefault(); if (!e.repeat) h.setPanMode(true); break;
      }
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.key === " ") ref.current.setPanMode(false);
    };
    const onBlur = () => ref.current.setPanMode(false);

    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);
}