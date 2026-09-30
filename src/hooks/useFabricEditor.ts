"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { ActiveSelection, Canvas, Ellipse, FabricImage, FabricObject, IText, Path, PencilBrush, Point, Polygon, Rect } from "fabric";

export type Tool = "select" | "hand" | "rect" | "diamond" | "ellipse" | "arrow" | "line" | "pen" | "text" | "eraser";
export const SHAPE_TOOLS: Tool[] = ["rect", "diamond", "ellipse", "arrow", "line"];
export const FONT = { hand: "Caveat", normal: "Assistant", code: "monospace" } as const;

export interface Style {
  stroke: string; 
  fill: string;
  strokeWidth: number;
  opacity: number;
  fontFamily: string;
  fontSize: number;
  rounded: boolean;
}
export type SelectionKind = "rect" | "shape" | "text" | "path" | "other";
export interface SelectionProps extends Style {
  kind: SelectionKind;
}

const DEFAULT_STYLE: Style = {
  stroke: "#1e1e1e",
  fill: "transparent",
  strokeWidth: 2,
  opacity: 1,
  fontFamily: FONT.hand,
  fontSize: 28,
  rounded: true,
};
const HISTORY_LIMIT = 100;
const BG = "#ffffff";

Object.assign(FabricObject.ownDefaults, {
  borderColor: "#6965db",
  cornerColor: "#ffffff",
  cornerStrokeColor: "#6965db",
  cornerStyle: "circle",
  cornerSize: 10,
  transparentCorners: false,
  borderScaleFactor: 1.5,
  padding: 6,
});

type XY = { x: number; y: number };

const serialize = (c: Canvas) => JSON.stringify(c.toJSON());
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const loadFonts = () =>
  Promise.all([`28px ${FONT.hand}`, `28px ${FONT.normal}`].map((f) => document.fonts.load(f))).catch(() => undefined);

// Fabric helpers
function syncMode(c: Canvas, tool: Tool, space: boolean, color: string, width: number, discard: boolean) {
  const pan = space || tool === "hand";
  const pen = tool === "pen" && !space;
  c.isDrawingMode = pen;
  if (pen) {
    const brush = c.freeDrawingBrush ?? new PencilBrush(c);
    brush.color = color;
    brush.width = width;
    c.freeDrawingBrush = brush;
  }
  c.skipTargetFind = pan || !(tool === "select" || tool === "eraser");
  c.selection = tool === "select" && !pan;
  const cursor = pan ? "grab" : tool === "select" ? "default" : "crosshair";
  c.defaultCursor = cursor;
  c.hoverCursor = tool === "select" && !pan ? "move" : cursor;
  c.freeDrawingCursor = "crosshair";
  if (discard && tool !== "select") c.discardActiveObject();
  c.requestRenderAll();
}

function finalize(c: Canvas) {
  c.getObjects().forEach((o) => {
    if (o instanceof Path) o.perPixelTargetFind = true;
  });
}

function readSelection(c: Canvas): SelectionProps | null {
  const o = c.getActiveObjects()[0];
  if (!o) return null;
  const t = o instanceof IText ? o : null;
  const colour = (v: unknown, fb: string) => (typeof v === "string" && v ? v : fb);
  return {
    kind: t ? "text" : o instanceof Rect ? "rect" : o instanceof Ellipse || o instanceof Polygon ? "shape" : o instanceof Path ? "path" : "other",
    stroke: t ? colour(o.fill, "#1e1e1e") : colour(o.stroke, "#1e1e1e"),
    fill: t ? "transparent" : colour(o.fill, "transparent"),
    strokeWidth: o.strokeWidth ?? 0,
    opacity: o.opacity ?? 1,
    fontFamily: t ? t.fontFamily : FONT.hand,
    fontSize: t ? t.fontSize : 28,
    rounded: o instanceof Rect ? (o.rx ?? 0) > 0 : true,
  };
}

function applyPatch(o: FabricObject, p: Partial<Style>) {
  if (o instanceof IText) {
    if (p.stroke !== undefined) o.set("fill", p.stroke);
    if (p.fontFamily !== undefined) o.set("fontFamily", p.fontFamily);
    if (p.fontSize !== undefined) o.set("fontSize", p.fontSize);
  } else {
    if (p.stroke !== undefined) o.set("stroke", p.stroke);
    if (p.strokeWidth !== undefined) o.set("strokeWidth", p.strokeWidth);
    if (p.fill !== undefined && !(o instanceof Path)) o.set("fill", p.fill);
    if (p.rounded !== undefined && o instanceof Rect) {
      const r = p.rounded ? Math.min(16, o.width / 4, o.height / 4) : 0;
      o.set({ rx: r, ry: r });
    }
  }
  if (p.opacity !== undefined) o.set("opacity", p.opacity);
  o.setCoords();
}

function constrain(tool: Tool, a: XY, b: XY, shift: boolean): XY {
  if (!shift) return b;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (tool === "line" || tool === "arrow") {
    const step = Math.PI / 12;
    const ang = Math.round(Math.atan2(dy, dx) / step) * step;
    const len = Math.hypot(dx, dy);
    return { x: a.x + len * Math.cos(ang), y: a.y + len * Math.sin(ang) };
  }
  const m = Math.max(Math.abs(dx), Math.abs(dy));
  return { x: a.x + Math.sign(dx || 1) * m, y: a.y + Math.sign(dy || 1) * m };
}

function build(tool: Tool, a: XY, b: XY, s: Style): FabricObject | null {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const w = Math.abs(b.x - a.x);
  const h = Math.abs(b.y - a.y);
  const base = {
    stroke: s.stroke,
    strokeWidth: s.strokeWidth,
    opacity: s.opacity,
    strokeUniform: true,
    strokeLineCap: "round" as const,
    strokeLineJoin: "round" as const,
  };
  if (tool === "rect") {
    const r = s.rounded ? Math.min(16, w / 4, h / 4) : 0;
    return new Rect({ ...base, fill: s.fill, left: x, top: y, width: w, height: h, rx: r, ry: r });
  }
  if (tool === "ellipse") return new Ellipse({ ...base, fill: s.fill, left: x, top: y, rx: w / 2, ry: h / 2 });
  if (tool === "diamond") {
    return new Polygon(
      [{ x: w / 2, y: 0 }, { x: w, y: h / 2 }, { x: w / 2, y: h }, { x: 0, y: h / 2 }],
      { ...base, fill: s.fill, left: x, top: y },
    );
  }
  if (tool === "line" || tool === "arrow") {
    if (w + h < 1) return null;
    let d = `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
    if (tool === "arrow") {
      const ang = Math.atan2(b.y - a.y, b.x - a.x);
      const len = Math.max(14, s.strokeWidth * 5);
      const p1 = { x: b.x - len * Math.cos(ang - Math.PI / 6), y: b.y - len * Math.sin(ang - Math.PI / 6) };
      const p2 = { x: b.x - len * Math.cos(ang + Math.PI / 6), y: b.y - len * Math.sin(ang + Math.PI / 6) };
      d += ` M ${p1.x} ${p1.y} L ${b.x} ${b.y} L ${p2.x} ${p2.y}`;
    }
    return new Path(d, { ...base, fill: null, perPixelTargetFind: true });
  }
  return null;
}

export function useFabricEditor({ containerRef, onChange }: { containerRef: RefObject<HTMLDivElement | null>; onChange?: () => void }) {
  const canvasRef = useRef<Canvas | null>(null);
  const history = useRef<string[]>([]);
  const cursor = useRef(-1);
  const locked = useRef(false);
  const toolRef = useRef<Tool>("select");
  const lockRef = useRef(false);
  const spaceRef = useRef(false);
  const styleRef = useRef<Style>(DEFAULT_STYLE);
  const prevTool = useRef<Tool>("select");
  const commitTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const onChangeRef = useRef(onChange);

  const [ready, setReady] = useState(false);
  const [tool, setToolState] = useState<Tool>("select");
  const [toolLock, setToolLock] = useState(false);
  const [style, setStyle] = useState<Style>(DEFAULT_STYLE);
  const [selection, setSelection] = useState<SelectionProps | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    onChangeRef.current = onChange;
  });

  const setTool = useCallback((t: Tool) => {
    toolRef.current = t;
    setToolState(t);
  }, []);

  const toggleLock = useCallback(() => {
    lockRef.current = !lockRef.current;
    setToolLock(lockRef.current);
  }, []);

  const refreshMeta = useCallback(() => {
    setCanUndo(cursor.current > 0);
    setCanRedo(cursor.current < history.current.length - 1);
    setIsEmpty((canvasRef.current?.getObjects().length ?? 0) === 0);
  }, []);

  const commit = useCallback(() => {
    const c = canvasRef.current;
    if (!c || locked.current) return;
    const snap = serialize(c);
    if (snap === history.current[cursor.current]) return;
    history.current = history.current.slice(0, cursor.current + 1).concat(snap).slice(-HISTORY_LIMIT);
    cursor.current = history.current.length - 1;
    refreshMeta();
    onChangeRef.current?.();
  }, [refreshMeta]);

  // lifecycle and pointer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const el = document.createElement("canvas");
    container.appendChild(el);
    const canvas = new Canvas(el, {
      width: container.clientWidth,
      height: container.clientHeight,
      backgroundColor: BG,
      preserveObjectStacking: true,
      fireMiddleClick: true,
      targetFindTolerance: 8,
      selectionColor: "rgba(105,101,219,0.12)",
      selectionBorderColor: "#6965db",
      selectionLineWidth: 1,
    });
    canvasRef.current = canvas;
    void loadFonts().then(() => canvas.requestRenderAll());

    let start: XY | null = null;
    let preview: FabricObject | null = null;
    let textAt: XY | null = null;
    let panning = false;
    let last: XY = { x: 0, y: 0 };

    const withLock = (fn: () => void) => {
      const prev = locked.current;
      locked.current = true;
      try {
        fn();
      } finally {
        locked.current = prev;
      }
    };
    const isPan = () => spaceRef.current || toolRef.current === "hand";

    const createText = (p: XY) => {
      const s = styleRef.current;
      const t = new IText("", { left: p.x, top: p.y, fontFamily: s.fontFamily, fontSize: s.fontSize, fill: s.stroke, opacity: s.opacity });
      withLock(() => canvas.add(t));
      canvas.setActiveObject(t);
      t.enterEditing();
      canvas.requestRenderAll();
      if (!lockRef.current) setTool("select");
    };

    const sync = () => setSelection(readSelection(canvas));
    canvas.on("selection:created", sync);
    canvas.on("selection:updated", sync);
    canvas.on("selection:cleared", sync);
    canvas.on("object:added", commit);
    canvas.on("object:modified", commit);
    canvas.on("object:removed", commit);
    canvas.on("path:created", ({ path }) => {
      path.perPixelTargetFind = true;
    });
    canvas.on("text:editing:exited", ({ target }) => {
      if (target instanceof IText && !target.text.trim()) canvas.remove(target);
    });

    canvas.on("mouse:down", (opt) => {
      const e = opt.e as MouseEvent;
      if (isPan() || e.button === 1) {
        panning = true;
        last = { x: e.clientX, y: e.clientY };
        canvas.setCursor("grabbing");
        return;
      }
      const t = toolRef.current;
      const p = opt.scenePoint;
      if (t === "eraser") {
        if (opt.target) canvas.remove(opt.target);
        return;
      }
      if (t === "text") {
        textAt = { x: p.x, y: p.y };
        return;
      }
      if (SHAPE_TOOLS.includes(t)) {
        canvas.discardActiveObject();
        start = { x: p.x, y: p.y };
      }
    });

    canvas.on("mouse:move", (opt) => {
      const e = opt.e as MouseEvent;
      if (panning) {
        canvas.relativePan(new Point(e.clientX - last.x, e.clientY - last.y));
        last = { x: e.clientX, y: e.clientY };
        return;
      }
      if (toolRef.current === "eraser" && e.buttons === 1 && opt.target) {
        canvas.remove(opt.target);
        return;
      }
      const s0 = start;
      if (!s0) return;
      const end = constrain(toolRef.current, s0, opt.scenePoint, e.shiftKey);
      withLock(() => {
        if (preview) canvas.remove(preview);
        preview = build(toolRef.current, s0, end, styleRef.current);
        if (preview) canvas.add(preview);
      });
      canvas.requestRenderAll();
    });

    canvas.on("mouse:up", (opt) => {
      const e = opt.e as MouseEvent;
      if (panning) {
        panning = false;
        canvas.setCursor(canvas.defaultCursor);
        return;
      }
      if (textAt) {
        const p = textAt;
        textAt = null;
        createText(p);
        return;
      }
      const s0 = start;
      if (!s0) return;
      start = null;
      const t = toolRef.current;
      const end = constrain(t, s0, opt.scenePoint, e.shiftKey);
      withLock(() => {
        if (preview) canvas.remove(preview);
      });
      preview = null;
      const moved = Math.hypot(end.x - s0.x, end.y - s0.y) > 4;
      const obj = moved
        ? build(t, s0, end, styleRef.current)
        : t === "line" || t === "arrow"
          ? null
          : build(t, { x: s0.x - 60, y: s0.y - 40 }, { x: s0.x + 60, y: s0.y + 40 }, styleRef.current);
      if (!obj) return;
      canvas.add(obj);
      canvas.setActiveObject(obj);
      canvas.requestRenderAll();
      if (!lockRef.current) setTool("select");
    });

    canvas.on("mouse:dblclick", (opt) => {
      if (toolRef.current === "select" && !opt.target) createText(opt.scenePoint);
    });

    // Wheel pans
    canvas.on("mouse:wheel", (opt) => {
      const e = opt.e as WheelEvent;
      e.preventDefault();
      e.stopPropagation();
      if (e.ctrlKey || e.metaKey) {
        const z = clamp(canvas.getZoom() * 0.999 ** e.deltaY, 0.1, 8);
        canvas.zoomToPoint(new Point(e.offsetX, e.offsetY), z);
        setZoom(z);
      } else {
        canvas.relativePan(new Point(-e.deltaX, -e.deltaY));
      }
    });

    const ro = new ResizeObserver(() => {
      canvas.setDimensions({ width: container.clientWidth, height: container.clientHeight });
      canvas.requestRenderAll();
    });
    ro.observe(container);
    setReady(true);

    return () => {
      ro.disconnect();
      clearTimeout(commitTimer.current);
      canvasRef.current = null;
      setReady(false);
      void canvas.dispose().then(() => el.remove());
    };
  }, [commit, containerRef, setTool]);

  //  Tool / brush mode
  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !ready) return;
    const discard = prevTool.current !== tool;
    prevTool.current = tool;
    syncMode(c, tool, spaceRef.current, style.stroke, style.strokeWidth, discard);
  }, [tool, ready, style.stroke, style.strokeWidth]);

  const setPanMode = useCallback((on: boolean) => {
    spaceRef.current = on;
    const c = canvasRef.current;
    if (c) syncMode(c, toolRef.current, on, styleRef.current.stroke, styleRef.current.strokeWidth, false);
  }, []);

  //  Load / history
  const getJSON = useCallback((): string | null => {
    const c = canvasRef.current;
    return c ? serialize(c) : null;
  }, []);

  const loadJSON = useCallback(
    async (json: string | null) => {
      const c = canvasRef.current;
      if (!c) return;
      await loadFonts();
      locked.current = true;
      try {
        if (json) await c.loadFromJSON(json);
        else c.clear();
        c.backgroundColor = BG;
        finalize(c);
        c.requestRenderAll();
      } finally {
        locked.current = false;
      }
      history.current = [serialize(c)];
      cursor.current = 0;
      setSelection(null);
      refreshMeta();
    },
    [refreshMeta],
  );

  const go = useCallback(
    async (target: number) => {
      const c = canvasRef.current;
      if (!c || target < 0 || target >= history.current.length) return;
      locked.current = true;
      try {
        await c.loadFromJSON(history.current[target]);
        finalize(c);
        c.requestRenderAll();
      } finally {
        locked.current = false;
      }
      cursor.current = target;
      setSelection(null);
      refreshMeta();
      onChangeRef.current?.();
    },
    [refreshMeta],
  );
  const undo = useCallback(() => void go(cursor.current - 1), [go]);
  const redo = useCallback(() => void go(cursor.current + 1), [go]);

  // Styling
  const updateStyle = useCallback(
    (patch: Partial<Style>) => {
      styleRef.current = { ...styleRef.current, ...patch };
      setStyle(styleRef.current);
      const c = canvasRef.current;
      if (!c) return;
      const objs = c.getActiveObjects();
      if (!objs.length) return;
      objs.forEach((o) => applyPatch(o, patch));
      c.requestRenderAll();
      setSelection(readSelection(c));
      clearTimeout(commitTimer.current);
      commitTimer.current = setTimeout(commit, 350);
    },
    [commit],
  );

  // Object actions 
  const place = useCallback(
    (obj: FabricObject) => {
      const c = canvasRef.current;
      if (!c) return;
      const vpt = c.viewportTransform;
      const z = c.getZoom();
      obj.set({ originX: "center", originY: "center", left: (c.getWidth() / 2 - vpt[4]) / z, top: (c.getHeight() / 2 - vpt[5]) / z });
      setTool("select");
      c.add(obj);
      c.setActiveObject(obj);
      c.requestRenderAll();
    },
    [setTool],
  );

  const insertSvg = useCallback(
    async (svg: string) => {
      const c = canvasRef.current;
      if (!c) return;
      const img = await FabricImage.fromURL("data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg));
      const z = c.getZoom();
      const scale = Math.min(1, (c.getWidth() * 0.7) / z / (img.width || 1), (c.getHeight() * 0.7) / z / (img.height || 1));
      img.scale(scale);
      place(img);
    },
    [place],
  );

  const deleteSelected = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const objs = c.getActiveObjects();
    if (!objs.length) return;
    locked.current = true;
    c.discardActiveObject();
    c.remove(...objs);
    locked.current = false;
    c.requestRenderAll();
    commit();
  }, [commit]);

  const duplicate = useCallback(async () => {
    const c = canvasRef.current;
    if (!c) return;
    const objs = c.getActiveObjects();
    if (!objs.length) return;
    c.discardActiveObject();
    const clones = await Promise.all(objs.map((o) => o.clone()));
    locked.current = true;
    clones.forEach((cl) => {
      cl.set({ left: (cl.left ?? 0) + 24, top: (cl.top ?? 0) + 24 });
      c.add(cl);
    });
    c.setActiveObject(clones.length > 1 ? new ActiveSelection(clones, { canvas: c }) : clones[0]);
    locked.current = false;
    c.requestRenderAll();
    commit();
  }, [commit]);

  const arrange = useCallback(
    (where: "front" | "back") => {
      const c = canvasRef.current;
      if (!c) return;
      const objs = c.getActiveObjects();
      if (!objs.length) return;
      locked.current = true;
      if (where === "front") objs.forEach((o) => c.bringObjectToFront(o));
      else [...objs].reverse().forEach((o) => c.sendObjectToBack(o));
      locked.current = false;
      c.requestRenderAll();
      commit();
    },
    [commit],
  );

  const selectAll = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    setTool("select");
    const objs = c.getObjects();
    if (!objs.length) return;
    c.discardActiveObject();
    c.setActiveObject(new ActiveSelection(objs, { canvas: c }));
    c.requestRenderAll();
  }, [setTool]);

  const clearAll = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    locked.current = true;
    c.clear();
    c.backgroundColor = BG;
    locked.current = false;
    c.requestRenderAll();
    commit();
  }, [commit]);

  const deselect = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    c.discardActiveObject();
    c.requestRenderAll();
    setTool("select");
  }, [setTool]);

  // View 
  const zoomBy = useCallback((factor: number) => {
    const c = canvasRef.current;
    if (!c) return;
    const z = clamp(c.getZoom() * factor, 0.1, 8);
    c.zoomToPoint(new Point(c.getWidth() / 2, c.getHeight() / 2), z);
    setZoom(z);
  }, []);

  const resetView = useCallback(() => {
    canvasRef.current?.setViewportTransform([1, 0, 0, 1, 0, 0]);
    setZoom(1);
  }, []);

  const exportPNG = useCallback((filename: string) => {
    const c = canvasRef.current;
    if (!c) return;
    const vpt = [...c.viewportTransform] as typeof c.viewportTransform;
    c.discardActiveObject();
    c.setViewportTransform([1, 0, 0, 1, 0, 0]);
    const url = c.toDataURL({ format: "png", multiplier: 2 });
    c.setViewportTransform(vpt);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename || "canvas"}.png`;
    a.click();
  }, []);

  return {
    ready, tool, setTool, toolLock, toggleLock, style, selection, updateStyle,
    canUndo, canRedo, isEmpty, zoom,
    getJSON, loadJSON, undo, redo, insertSvg, deleteSelected, duplicate, arrange,
    selectAll, clearAll, deselect, setPanMode, zoomBy, resetView, exportPNG,
  };
}