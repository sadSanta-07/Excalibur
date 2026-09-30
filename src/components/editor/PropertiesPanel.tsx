"use client";

import { BringToFront, Copy, SendToBack, Trash2 } from "lucide-react";
import { FONT, type SelectionKind, type SelectionProps, type Style, type Tool } from "@/hooks/useFabricEditor";

const STROKES = ["#1e1e1e", "#e03131", "#2f9e44", "#1971c2", "#f08c00"];
const FILLS = ["transparent", "#ffc9c9", "#b2f2bb", "#a5d8ff", "#ffec99"];
const WIDTHS = [{ v: 1, l: "Thin" }, { v: 2, l: "Bold" }, { v: 4, l: "Extra bold" }];
const SIZES = [{ v: 20, l: "S" }, { v: 28, l: "M" }, { v: 40, l: "L" }, { v: 56, l: "XL" }];
const FAMILIES = [{ v: FONT.hand, l: "Hand-drawn" }, { v: FONT.normal, l: "Normal" }, { v: FONT.code, l: "Code" }];
const isHex = (v: string) => /^#[0-9a-f]{6}$/i.test(v);

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="field-label">{label}</div>
      {children}
    </div>
  );
}

function Swatches({ colors, value, onPick }: { colors: string[]; value: string; onPick: (c: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {colors.map((c) => (
        <button
          key={c}
          className="swatch"
          data-active={value === c}
          aria-label={c}
          onClick={() => onPick(c)}
          style={
            c === "transparent"
              ? { backgroundImage: "linear-gradient(135deg, transparent 45%, #e03131 45%, #e03131 55%, transparent 55%)" }
              : { backgroundColor: c }
          }
        />
      ))}
      <input
        type="color"
        className="swatch cursor-pointer"
        aria-label="Custom colour"
        value={isHex(value) ? value : "#000000"}
        onChange={(e) => onPick(e.target.value)}
      />
    </div>
  );
}

interface Props {
  tool: Tool;
  style: Style;
  selection: SelectionProps | null;
  onStyle: (p: Partial<Style>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onArrange: (w: "front" | "back") => void;
}

export default function PropertiesPanel({ tool, style, selection, onStyle, onDuplicate, onDelete, onArrange }: Props) {
  const kind: SelectionKind | null =
    selection?.kind ??
    (tool === "text" ? "text"
      : tool === "rect" ? "rect"
      : tool === "diamond" || tool === "ellipse" ? "shape"
      : tool === "arrow" || tool === "line" || tool === "pen" ? "path"
      : null);
  if (!kind) return null;

  const v = selection ?? { ...style, kind };
  const hasFill = kind === "rect" || kind === "shape";
  const hasWidth = hasFill || kind === "path";
  const isText = kind === "text";

  return (
    <aside className="island pop absolute left-4 top-20 z-20 max-h-[calc(100vh-11rem)] w-60 space-y-4 overflow-y-auto p-3 max-md:hidden">
      {(hasWidth || isText) && (
        <Field label={isText ? "Colour" : "Stroke"}>
          <Swatches colors={STROKES} value={v.stroke} onPick={(c) => onStyle({ stroke: c })} />
        </Field>
      )}
      {hasFill && (
        <Field label="Background">
          <Swatches colors={FILLS} value={v.fill} onPick={(c) => onStyle({ fill: c })} />
        </Field>
      )}
      {hasWidth && (
        <Field label="Stroke width">
          <div className="flex gap-1">
            {WIDTHS.map((w) => (
              <button key={w.v} className="icon-btn" data-active={v.strokeWidth === w.v} title={w.l} aria-label={w.l} onClick={() => onStyle({ strokeWidth: w.v })}>
                <span style={{ height: w.v + 1, width: 18, background: "currentColor", borderRadius: 2 }} />
              </button>
            ))}
          </div>
        </Field>
      )}
      {kind === "rect" && (
        <Field label="Edges">
          <div className="flex gap-1">
            <button className="icon-btn" data-active={!v.rounded} title="Sharp" aria-label="Sharp edges" onClick={() => onStyle({ rounded: false })}>
              <span className="block h-4 w-4 border-2 border-current" />
            </button>
            <button className="icon-btn" data-active={v.rounded} title="Round" aria-label="Round edges" onClick={() => onStyle({ rounded: true })}>
              <span className="block h-4 w-4 rounded-[5px] border-2 border-current" />
            </button>
          </div>
        </Field>
      )}
      {isText && (
        <>
          <Field label="Font">
            <div className="flex gap-1">
              {FAMILIES.map((f) => (
                <button key={f.v} className="icon-btn" data-active={v.fontFamily === f.v} title={f.l} aria-label={f.l} onClick={() => onStyle({ fontFamily: f.v })} style={{ fontFamily: f.v, fontSize: 18 }}>
                  Aa
                </button>
              ))}
            </div>
          </Field>
          <Field label="Font size">
            <div className="flex gap-1">
              {SIZES.map((s) => (
                <button key={s.v} className="icon-btn text-sm font-semibold" data-active={Math.round(v.fontSize) === s.v} onClick={() => onStyle({ fontSize: s.v })}>
                  {s.l}
                </button>
              ))}
            </div>
          </Field>
        </>
      )}
      <Field label={`Opacity · ${Math.round(v.opacity * 100)}%`}>
        <input type="range" className="w-full" min={0.1} max={1} step={0.05} value={v.opacity} onChange={(e) => onStyle({ opacity: Number(e.target.value) })} />
      </Field>
      {selection && (
        <Field label="Actions">
          <div className="flex gap-1">
            <button className="icon-btn" title="Send to back" aria-label="Send to back" onClick={() => onArrange("back")}><SendToBack size={16} /></button>
            <button className="icon-btn" title="Bring to front" aria-label="Bring to front" onClick={() => onArrange("front")}><BringToFront size={16} /></button>
            <button className="icon-btn" title="Duplicate (Ctrl+D)" aria-label="Duplicate" onClick={onDuplicate}><Copy size={16} /></button>
            <button className="icon-btn" title="Delete (Del)" aria-label="Delete" onClick={onDelete}><Trash2 size={16} /></button>
          </div>
        </Field>
      )}
    </aside>
  );
}