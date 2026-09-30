"use client";

import { useState, type ComponentProps } from "react";
import { Check, Link2, Loader2, Save, TriangleAlert } from "lucide-react";
import MainMenu from "./MainMenu";
import type { SaveStatus } from "./types";

interface Props {
  title: string;
  onTitle: (t: string) => void;
  status: SaveStatus;
  onSave: () => void;
  menu: ComponentProps<typeof MainMenu>;
}

const LABEL: Record<SaveStatus, string> = {
  saved: "All changes saved",
  unsaved: "Unsaved changes",
  saving: "Saving…",
  error: "Couldn't save",
};

export default function TopBar({ title, onTitle, status, onSave, menu }: Props) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-3 p-4">
      <div className="pointer-events-auto flex items-center gap-2">
        <MainMenu {...menu} />
        <div className="island hidden h-11 items-center px-2 lg:flex">
          <input
            value={title}
            onChange={(e) => onTitle(e.target.value)}
            maxLength={60}
            aria-label="Canvas title"
            className="w-48 rounded-md bg-transparent px-2 py-1 text-sm font-semibold text-ink outline-none focus:bg-surface"
          />
        </div>
      </div>

      <div className="pointer-events-auto flex items-center gap-2">
        <span className={`hidden items-center gap-1.5 text-sm xl:flex ${status === "error" ? "text-danger" : "text-muted"}`}>
          {status === "saving" && <Loader2 size={14} className="animate-spin" />}
          {status === "saved" && <Check size={14} />}
          {status === "error" && <TriangleAlert size={14} />}
          {LABEL[status]}
        </span>
        <button className="btn btn-secondary" onClick={onSave} title="Save (Ctrl+S)">
          <Save size={16} /> <span className="hidden sm:inline">Save</span>
        </button>
        <button className="btn btn-primary" onClick={copyLink} title="Copy shareable link">
          {copied ? <Check size={16} /> : <Link2 size={16} />} {copied ? "Link copied" : "Share"}
        </button>
      </div>
    </header>
  );
}