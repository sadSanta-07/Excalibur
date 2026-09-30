"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";

const Editor = dynamic(() => import("@/components/editor/Editor"), {
  ssr: false,
  loading: () => <div className="grid h-screen place-items-center text-neutral-500">Loading editor…</div>,
});

export default function CanvasPage() {
  const { canvasId } = useParams<{ canvasId: string }>();
  return <Editor key={canvasId} canvasId={canvasId} />;
}