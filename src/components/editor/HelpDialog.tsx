"use client";

import Modal from "@/components/Modal";

const GROUPS: { title: string; rows: [string, string][] }[] = [
  {
    title: "Tools",
    rows: [["Selection", "V or 1"], ["Hand", "H"], ["Rectangle", "R or 2"], ["Diamond", "D or 3"], ["Ellipse", "O or 4"],
      ["Arrow", "A or 5"], ["Line", "L or 6"], ["Draw", "P or 7"], ["Text", "T or 8, or double-click"], ["Eraser", "E or 9"], ["Lock tool", "Q"]],
  },
  {
    title: "Editing",
    rows: [["Undo / Redo", "Ctrl+Z / Ctrl+Shift+Z"], ["Duplicate", "Ctrl+D"], ["Select all", "Ctrl+A"], ["Delete", "Del"], ["Save", "Ctrl+S"], ["Constrain shape/angle", "Hold Shift"]],
  },
  {
    title: "View",
    rows: [["Pan", "Space + drag, wheel, or Hand"], ["Zoom", "Ctrl + wheel, Ctrl +/-"], ["Reset zoom", "Ctrl+0"]],
  },
];

export default function HelpDialog({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Keyboard shortcuts" onClose={onClose}>
      <div className="max-h-[60vh] space-y-5 overflow-y-auto">
        {GROUPS.map((g) => (
          <section key={g.title}>
            <h3 className="field-label uppercase tracking-wide">{g.title}</h3>
            {g.rows.map(([a, b]) => (
              <div key={a} className="flex justify-between py-1 text-sm">
                <span className="text-ink">{a}</span>
                <span className="text-muted">{b}</span>
              </div>
            ))}
          </section>
        ))}
      </div>
    </Modal>
  );
}