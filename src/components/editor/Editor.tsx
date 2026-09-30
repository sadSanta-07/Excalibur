"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Keyboard } from "lucide-react";
import { loadCanvas, saveCanvas } from "@/lib/canvasService";
import { rememberCanvas } from "@/lib/recent";
import { useFabricEditor } from "@/hooks/useFabricEditor";
import { useShortcuts } from "@/hooks/useShortcuts";
import BottomBar from "./BottomBar";
import HelpDialog from "./HelpDialog";
import MermaidDialog from "./MermaidDialog";
import PropertiesPanel from "./PropertiesPanel";
import Toolbar from "./Toolbar";
import TopBar from "./TopBar";
import type { SaveStatus } from "./types";

type LoadState = "loading" | "ready" | "notfound" | "failed";
const AUTOSAVE_MS = 1500;

export default function Editor({ canvasId }: { canvasId: string }) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [title, setTitle] = useState("Untitled canvas");
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [mermaidOpen, setMermaidOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const loaded = useRef(false);
  const version = useRef(0);
  const savedVersion = useRef(0);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const titleRef = useRef(title);
  const getJSONRef = useRef<() => string | null>(() => null);

  const save = useCallback(async () => {
    const json = getJSONRef.current();
    if (!loaded.current || !json) return; // save after finish
    clearTimeout(saveTimer.current);
    const v = version.current;
    setSaveStatus("saving");
    try {
      await saveCanvas(canvasId, json, titleRef.current);
      savedVersion.current = v;
      rememberCanvas(canvasId, titleRef.current);
      if (v === version.current) setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    }
  }, [canvasId]);

  const markDirty = useCallback(() => {
    if (!loaded.current) return;
    version.current += 1;
    setSaveStatus("unsaved");
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void save(), AUTOSAVE_MS);
  }, [save]);

  const editor = useFabricEditor({ containerRef, onChange: markDirty });
  useEffect(() => {
    getJSONRef.current = editor.getJSON;
  });

  const { ready, loadJSON } = editor;
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    (async () => {
      try {
        const saved = await loadCanvas(canvasId);
        if (cancelled) return;
        if (!saved) return setLoadState("notfound");
        setTitle(saved.title);
        titleRef.current = saved.title;
        await loadJSON(saved.data);
        if (cancelled) return;
        loaded.current = true;
        rememberCanvas(canvasId, saved.title);
        setSaveStatus("saved");
        setLoadState("ready");
      } catch {
        if (!cancelled) setLoadState("failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, canvasId, loadJSON]);

  useEffect(() => {
    const dirty = () => version.current !== savedVersion.current;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty()) e.preventDefault();
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden" && dirty()) void save();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("visibilitychange", onVisibility);
      clearTimeout(saveTimer.current);
    };
  }, [save]);

  const handleTitle = (t: string) => {
    setTitle(t);
    titleRef.current = t;
    markDirty();
  };

  const goHome = async () => {
    if (version.current !== savedVersion.current) await save();
    router.push("/");
  };

  const reset = () => {
    if (window.confirm("Reset the canvas? This clears everything (you can still undo).")) editor.clearAll();
  };

  useShortcuts(
    {
      undo: editor.undo,
      redo: editor.redo,
      save: () => void save(),
      duplicate: () => void editor.duplicate(),
      remove: editor.deleteSelected,
      deselect: editor.deselect,
      selectAll: editor.selectAll,
      setTool: editor.setTool,
      toggleLock: editor.toggleLock,
      setPanMode: editor.setPanMode,
      zoomBy: editor.zoomBy,
      resetView: editor.resetView,
      help: () => setHelpOpen(true),
    },
    mermaidOpen || helpOpen,
  );

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-bg">
      <div ref={containerRef} className="canvas-layer absolute inset-0" />

      <TopBar
        title={title}
        onTitle={handleTitle}
        status={saveStatus}
        onSave={() => void save()}
        menu={{
          onSave: () => void save(),
          onExport: () => editor.exportPNG(title),
          onMermaid: () => setMermaidOpen(true),
          onHelp: () => setHelpOpen(true),
          onReset: reset,
          onHome: () => void goHome(),
        }}
      />
      <Toolbar
        tool={editor.tool}
        setTool={editor.setTool}
        locked={editor.toolLock}
        onToggleLock={editor.toggleLock}
        onMermaid={() => setMermaidOpen(true)}
      />
      <PropertiesPanel
        tool={editor.tool}
        style={editor.style}
        selection={editor.selection}
        onStyle={editor.updateStyle}
        onDuplicate={() => void editor.duplicate()}
        onDelete={editor.deleteSelected}
        onArrange={editor.arrange}
      />
      <BottomBar
        canUndo={editor.canUndo}
        canRedo={editor.canRedo}
        zoom={editor.zoom}
        onUndo={editor.undo}
        onRedo={editor.redo}
        onZoom={editor.zoomBy}
        onReset={editor.resetView}
      />
      <div className="island absolute bottom-4 right-4 z-20 p-1 max-md:hidden">
        <button className="icon-btn" onClick={() => setHelpOpen(true)} aria-label="Keyboard shortcuts" title="Keyboard shortcuts (?)">
          <Keyboard size={18} />
        </button>
      </div>

      {loadState === "ready" && editor.isEmpty && (
        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center px-6 text-center">
          <div className="text-muted/80">
            <p className="font-hand text-5xl font-bold">Pick a tool & start drawing!</p>
            <p className="mt-2 text-sm">Drag to draw · double-click to type · Space + drag to pan · Ctrl + wheel to zoom</p>
          </div>
        </div>
      )}

      {mermaidOpen && <MermaidDialog onClose={() => setMermaidOpen(false)} onInsert={editor.insertSvg} />}
      {helpOpen && <HelpDialog onClose={() => setHelpOpen(false)} />}

      {loadState !== "ready" && (
        <div className="absolute inset-0 z-50 grid place-items-center bg-bg px-6 text-center">
          {loadState === "loading" && <p className="animate-pulse text-muted">Loading your canvas…</p>}
          {loadState === "notfound" && (
            <div>
              <h2 className="font-hand text-6xl font-bold text-ink">Canvas not found</h2>
              <p className="mt-2 text-muted">This link may be wrong or the canvas was deleted.</p>
              <Link href="/" className="btn btn-primary btn-lg mt-6">Back to Excalibur</Link>
            </div>
          )}
          {loadState === "failed" && (
            <div>
              <h2 className="font-hand text-6xl font-bold text-ink">Couldn&apos;t load this canvas</h2>
              <p className="mt-2 text-muted">Check your connection and try again.</p>
              <button onClick={() => window.location.reload()} className="btn btn-primary btn-lg mt-6">Retry</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}