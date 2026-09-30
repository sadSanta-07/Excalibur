"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useSyncExternalStore } from "react";
import { Loader2, Trash2 } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { LogoMark, Wordmark } from "@/components/Logo";
import { createCanvas, deleteCanvas } from "@/lib/canvasService";
import { getRecentRaw, parseRecent, removeRecent, subscribeRecent } from "@/lib/recent";

export default function Home() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const raw = useSyncExternalStore(subscribeRecent, getRecentRaw, () => "[]");
  const recent = useMemo(() => parseRecent(raw), [raw]);

  async function handleCreate() {
    setBusy(true);
    setError(null);
    try {
      router.push(`/canvas/${await createCanvas()}`);
    } catch {
      setError("Couldn't create a canvas. Check your connection and try again.");
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    if (confirmId !== id) {
      setConfirmId(id);
      setTimeout(() => setConfirmId((c) => (c === id ? null : c)), 2500);
      return;
    }
    setConfirmId(null);
    try {
      await deleteCanvas(id);
    } catch {
      /* rules may block deletes */
    }
    removeRecent(id);
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center px-6 pb-16 pt-24">
      <div className="absolute right-4 top-4 island p-1">
        <ThemeToggle />
      </div>

      <LogoMark size={56} />
      <h1 className="mt-4 text-center text-7xl leading-none">
        <Wordmark />
      </h1>
      <p className="mt-4 max-w-md text-center text-lg text-muted">
        A tiny canvas for big ideas. Sketch, turn Mermaid into diagrams, share the link, keep editing anywhere.
      </p>

      <button onClick={handleCreate} disabled={busy} className="btn btn-primary btn-lg mt-8">
        {busy && <Loader2 className="animate-spin" size={18} />}
        {busy ? "Creating…" : "Create new canvas"}
      </button>
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      {recent.length > 0 && (
        <section className="mt-14 w-full max-w-lg">
          <h2 className="field-label uppercase tracking-wide">Recent canvases</h2>
          <ul className="space-y-2">
            {recent.map((c) => (
              <li key={c.id} className="group relative">
                <Link
                  href={`/canvas/${c.id}`}
                  className="island block px-4 py-3 pr-24 transition hover:outline hover:outline-2 hover:outline-primary"
                >
                  <div className="truncate font-semibold text-ink">{c.title || "Untitled canvas"}</div>
                  <div className="text-xs text-muted">{new Date(c.openedAt).toLocaleString()}</div>
                </Link>
                <button
                  onClick={() => void handleDelete(c.id)}
                  aria-label={`Delete ${c.title}`}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1.5 text-sm font-semibold transition ${confirmId === c.id
                      ? "bg-danger text-bg"
                      : "text-muted opacity-60 hover:bg-surface hover:opacity-100 group-hover:opacity-100"
                    }`}
                >
                  {confirmId === c.id ? "Delete?" : <Trash2 size={16} />}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-12 text-center text-xs text-muted">
        Anyone with a canvas link can view and edit it. Keep the link private.
      </p>
    </main>
  );
}