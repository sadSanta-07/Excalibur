# Excalibur

A lightweight, Excalidraw-inspired canvas editor. Every canvas lives at its own URL (`/canvas/:canvasId`), saves to Firestore automatically, and can be reopened and edited from any device. No account needed.

- **Live demo:** `https://excalibur-sepia.vercel.app`

## What you can do

**Draw**
- Rectangle, diamond, ellipse, arrow, line, freehand pen, text, eraser
- Drag to draw; hold `Shift` to constrain to a square, circle or 15° angle
- Double-click empty space to type text
- Move, resize, rotate, duplicate, delete, bring to front / send to back
- Edit stroke, fill, stroke width, edges, font (hand-drawn / normal / code), size and opacity

**Mermaid to diagram**
- Paste Mermaid code, preview it live (optionally hand-drawn style), insert it on the canvas

**Canvases**
- "Create new canvas" makes a Firestore document and opens `/canvas/<id>`
- Autosave (1.5 s after the last change) plus a manual Save button and `Ctrl+S`
- Save status indicator, unsaved-changes warning on tab close, flush on tab hide
- Editable canvas title, shareable link, PNG export
- Recent canvases on the home page, with delete (removes the Firestore doc too)
- Friendly "not found" and "couldn't load" screens

**Feel**
- Light and dark theme (follows the OS, remembered, no flash on load)
- Undo / redo (100 steps), zoom, pan (`Space`+drag, wheel, hand tool)
- Full keyboard shortcuts (press `?` in the editor)

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router), React, TypeScript |
| Canvas | Fabric.js v6 |
| Database | Firebase Firestore (no auth) |
| Styling | Tailwind CSS v4 + CSS variables for theming |
| Diagrams | Mermaid |
| Hosting | Vercel |

## Run locally

```bash
git clone <repo-url>
cd excalibur
npm install
cp .env.example .env.local   # fill in your Firebase web app config
npm run dev
```

Open http://localhost:3000.

### Firebase setup
1. Create a Firebase project and add a **Web app**; copy the config into `.env.local`.
2. Create a **Firestore database**.
3. Publish the rules in [`firestore.rules`](./firestore.rules).

### Deploy
Import the repo into Vercel and add the six `NEXT_PUBLIC_FIREBASE_*` variables. No rewrites are needed; `/canvas/:id` is a normal dynamic route.

## Data model

One collection, one document per canvas. The document ID is the canvas ID in the URL.

```
canvases/{canvasId}
  title:     string
  data:      string      // JSON.stringify(fabricCanvas.toJSON())
  createdAt: timestamp
  updatedAt: timestamp
```

The scene is stored as a JSON string rather than a nested map. Firestore rejects some shapes Fabric emits (nested arrays, `undefined`), and the string keeps the schema stable no matter what Fabric adds. Trade-off: you can't query inside a scene, which this app never needs.

## Project structure

```
src/
  app/
    page.tsx                    Home: create canvas, recent list, delete
    canvas/[canvasId]/page.tsx  Loads the editor client-side only (Fabric needs the DOM)
  components/editor/            Editor shell, Toolbar, PropertiesPanel, TopBar, MainMenu,
                                BottomBar, MermaidDialog, HelpDialog
  hooks/
    useFabricEditor.ts          Canvas lifecycle, tools, history, styling, view
    useShortcuts.ts             Keyboard shortcuts
  lib/
    canvasService.ts            The only file that talks to Firestore
    recent.ts, theme.ts         localStorage-backed stores
```

More detail in [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).

## Decisions worth knowing

- **React owns the UI, Fabric owns the canvas.** The Fabric instance lives in a ref, never in React state. Only what the UI needs (active tool, selection style, undo availability) is state.
- **Saves can't clobber data.** Autosave is disabled until the initial load finishes, and a version counter tracks what has actually reached Firestore.
- **Dark mode inverts the canvas layer with a CSS filter** (the same trick Excalidraw uses), so saved colours are never rewritten and drawings look right in both themes.
- **Persistence goes through one service file**, so swapping Firestore for something else touches one module.

## Known limitations

Stated plainly, because they are real:

- **No auth.** Anyone with a canvas link can view and edit it, and the Firestore rules are open by design for this exercise. A production version needs auth and ownership rules.
- **No real-time collaboration.** Two people editing one canvas at once is last-write-wins.
- **Mermaid output is inserted as a single scalable object**, not as separate editable shapes.
- **Shapes are clean vectors**, not rough/sketchy strokes. The hand-drawn feel comes from the UI and text font.
- **Recent canvases are stored per browser** (localStorage), not per user.
- **A canvas is one Firestore document (1 MB cap).** Very large scenes will fail to save and the UI shows a save error.
- No image upload and no arrow binding to shapes yet.

## Compared with Excalidraw

Excalidraw is the reference point and is far more mature. Honest comparison:

| | Excalibur | Excalidraw |
|---|---|---|
| Hand-drawn (rough) shapes | No | Yes |
| Real-time collaboration | No | Yes |
| Shape libraries, images, bound arrows | No | Yes |
| Mermaid to editable elements | No (inserts one object) | Yes |
| Many named canvases at their own URLs, saved server-side, no account | **Yes** | The free app keeps one working scene in the browser; a cloud multi-scene workspace is part of Excalidraw+ |
| Dark mode, shortcuts, PNG export, undo/redo | Yes | Yes |

Excalibur isn't trying to replace Excalidraw. It explores one idea: **a canvas is a URL**. Create one in a click, share the link, and it's still there tomorrow, with no sign-up.

## What I'd do next

1. Anonymous auth + ownership rules, so a canvas link can be view-only
2. Real-time sync (Firestore listeners), starting with presence
3. Per-object storage instead of one blob, to remove the 1 MB limit and reduce write size
4. rough.js rendering for the sketchy look
5. Convert Mermaid output into native editable shapes