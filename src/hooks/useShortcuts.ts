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
  selectAll: () => void;
  setTool: (t: Tool) => void;
  toggleLock: () => void;
  setPanMode: (on: boolean) => void;
  zoomBy: (f: number) => void;
  resetView: () => void;
  help: () => void;
}

const TOOL_KEYS: Record<string, Tool> = {
  v: "select", "1": "select",
  h: "hand",
  r: "rect", "2": "rect",
  d: "diamond", "3": "diamond",
  o: "ellipse", "4": "ellipse",
  a: "arrow", "5": "arrow",
  l: "line", "6": "line",
  p: "pen", "7": "pen",
  t: "text", "8": "text",
  e: "eraser", "9": "eraser",
};

// Only real text fields should swallow shortcuts, not sliders, colour pickers or buttons
const TEXT_INPUT_TYPES = new Set(["text", "search", "email", "url", "password", "number", "tel"]);

export function useShortcuts(handlers: ShortcutHandlers, disabled = false) {
  const ref = useRef(handlers);
  const disabledRef = useRef(disabled);

  useEffect(() => {
    ref.current = handlers;
    disabledRef.current = disabled;
  });

  useEffect(() => {
    const isTyping = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return false;
      if (t.isContentEditable || t.tagName === "TEXTAREA") return true;
      if (t.tagName === "INPUT") return TEXT_INPUT_TYPES.has((t as HTMLInputElement).type);
      return false;
    };

    const onDown = (e: KeyboardEvent) => {
      if (isTyping(e) || disabledRef.current) return;

      const h = ref.current;
      const k = e.key.toLowerCase();
      const mod = e.ctrlKey || e.metaKey;

      if (mod) {
        if (k === "z") {
          e.preventDefault();
          if (e.shiftKey) h.redo();
          else h.undo();
        } else if (k === "y") {
          e.preventDefault();
          h.redo();
        } else if (k === "s") {
          e.preventDefault();
          h.save();
        } else if (k === "d") {
          e.preventDefault();
          h.duplicate();
        } else if (k === "a") {
          e.preventDefault();
          h.selectAll();
        } else if (k === "0") {
          e.preventDefault();
          h.resetView();
        } else if (k === "=" || k === "+") {
          e.preventDefault();
          h.zoomBy(1.2);
        } else if (k === "-") {
          e.preventDefault();
          h.zoomBy(1 / 1.2);
        }
        return;
      }

      if (e.altKey) return;

      if (TOOL_KEYS[k]) {
        e.preventDefault();
        h.setTool(TOOL_KEYS[k]);
        return;
      }

      switch (k) {
        case "delete":
        case "backspace":
          e.preventDefault();
          h.remove();
          break;
        case "q":
          h.toggleLock();
          break;
        case "?":
          e.preventDefault();
          h.help();
          break;
        case "escape":
          h.deselect();
          break;
        case " ":
          e.preventDefault();
          if (!e.repeat) h.setPanMode(true);
          break;
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