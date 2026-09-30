"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/Modal";

const SAMPLES: Record<string, string> = {
  Flowchart: `flowchart TD
  A[Idea] --> B{Does it work?}
  B -- Yes --> C[Ship it]
  B -- No --> D[Debug] --> B`,
  Sequence: `sequenceDiagram
  participant U as User
  participant A as App
  participant DB as Firestore
  U->>A: Open /canvas/abc
  A->>DB: getDoc(abc)
  DB-->>A: canvas JSON
  A-->>U: Render canvas`,
  State: `stateDiagram-v2
  [*] --> Draft
  Draft --> Saved: Save
  Saved --> Draft: Edit
  Saved --> [*]`,
};

async function renderMermaid(code: string, handDrawn: boolean): Promise<string> {
  const mermaid = (await import("mermaid")).default;
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    theme: "neutral", 
    look: handDrawn ? "handDrawn" : "classic",
    flowchart: { htmlLabels: false },
    fontFamily: "Arial, sans-serif",
  });
  await mermaid.parse(code);
  const { svg } = await mermaid.render(`mmd-${Date.now()}`, code);
  return svg;
}

function withSize(svg: string): string {
  const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
  const el = doc.documentElement;
  const vb = el.getAttribute("viewBox")?.split(/[\s,]+/).map(Number);
  if (vb && vb.length === 4) {
    el.setAttribute("width", String(vb[2]));
    el.setAttribute("height", String(vb[3]));
  }
  el.style.removeProperty("max-width");
  return new XMLSerializer().serializeToString(el);
}

export default function MermaidDialog({ onClose, onInsert }: { onClose: () => void; onInsert: (svg: string) => void | Promise<void> }) {
  const [code, setCode] = useState(SAMPLES.Flowchart);
  const [hand, setHand] = useState(true);
  const [svg, setSvg] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const out = await renderMermaid(code, hand);
        if (!cancelled) {
          setSvg(out);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message.split("\n")[0] : "Invalid diagram");
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [code, hand]);

  async function insert() {
    if (!svg) return;
    await onInsert(withSize(svg));
    onClose();
  }

  return (
    <Modal title="Mermaid to diagram" onClose={onClose} wide>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {Object.keys(SAMPLES).map((k) => (
          <button key={k} className="btn btn-secondary h-8!" onClick={() => setCode(SAMPLES[k])}>{k}</button>
        ))}
        <label className="ml-auto flex cursor-pointer items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={hand} onChange={(e) => setHand(e.target.checked)} /> Hand-drawn look
        </label>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          spellCheck={false}
          aria-label="Mermaid code"
          className="h-72 w-full resize-none rounded-lg border border-line bg-bg p-3 font-mono text-sm text-ink outline-none focus:border-primary"
        />
        <div className="canvas-layer h-72 overflow-auto rounded-lg border border-line bg-white p-3 [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full">
          {svg ? <div dangerouslySetInnerHTML={{ __html: svg }} /> : <p className="text-sm text-neutral-500">Rendering…</p>}
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-danger">Syntax error: {error}</p>}
      <div className="mt-4 flex justify-end gap-2">
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={() => void insert()} disabled={!svg || !!error}>Insert on canvas</button>
      </div>
    </Modal>
  );
}