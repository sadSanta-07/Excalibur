# Architecture

## Overview

```
 Home (/)                         Editor (/canvas/:id)
 ────────                         ─────────────────────────────────────────
 createCanvas() ─┐                Editor.tsx   load, autosave, dialogs
 recent list     │                  ├─ useFabricEditor   canvas + tools + history
 deleteCanvas()  │                  ├─ useShortcuts      keyboard
                 ▼                  └─ UI: Toolbar, PropertiesPanel, TopBar,
           canvasService.ts              BottomBar, MainMenu, Mermaid/Help dialogs
                 │                                   │
                 └────────────► Firestore ◄──────────┘
                              canvases/{id}
```

Rule of thumb: **React renders the chrome, Fabric renders the canvas, `canvasService` is the only code that touches Firestore.**

## Lifecycle of a canvas

1. **Create.** Home calls `createCanvas()`, which adds a document with `data: null`, then navigates to `/canvas/<docId>`.
2. **Mount.** The route loads `Editor` with `ssr: false`, since Fabric needs the DOM. `useFabricEditor` creates the `<canvas>` imperatively and disposes it on cleanup, which keeps React StrictMode's double-mount from producing two canvases.
3. **Load.** Once Fabric is ready, `Editor` fetches the document:
   - missing → "Canvas not found"
   - network error → "Couldn't load" with Retry
   - found → `loadFromJSON`, reset history, mark ready
4. **Edit.** Fabric events (`object:added/modified/removed`) call `commit()`, which pushes a history snapshot and tells `Editor` the canvas is dirty.
5. **Save.** Dirty → 1.5 s debounce → `saveCanvas()`. Manual Save and `Ctrl+S` call the same function.
6. **Leave.** `visibilitychange` flushes a pending save; `beforeunload` warns if something hasn't reached Firestore.

## Save safety

Three details prevent the usual "lost my work" bugs:

- **Load guard.** `loaded.current` stays false until the initial load completes. Nothing can save before that, so an empty canvas can't overwrite real data.
- **Version counters.** `version` increments on every change; `savedVersion` records the last version that reached Firestore. "Saved" is only shown if no newer change happened during the request, and the unsaved-work warning compares the two.
- **Programmatic changes don't pollute history.** A `locked` flag suppresses `commit()` while the code itself changes the canvas (loading, undo, drawing previews).

## Undo / redo

Snapshot-based: each commit stores `canvas.toJSON()` as a string (max 100). Undo and redo load the snapshot at the new cursor position. Simple and reliable; the cost is memory on very large canvases, which would be the reason to move to a command/patch history later. Slider and colour drags are debounced 350 ms so one drag is one undo step.

## Drawing interaction

Shape tools don't create objects on click. They run a small state machine inside the Fabric mouse events:

- `mouse:down` records the start point (in scene coordinates, so zoom and pan are handled for free)
- `mouse:move` rebuilds a preview object, with `Shift` constraining the end point
- `mouse:up` removes the preview and adds the final object, then returns to the Select tool unless the tool lock is on

A plain click without dragging creates a default-sized shape. Arrows and lines are `Path` objects (an arrowhead is two extra segments), which keeps them one object that moves, scales and serialises like everything else.

The current tool, lock state and style live in refs as well as state, so event handlers always read fresh values without re-registering the Fabric listeners.

## Styling model

A single `Style` object holds the defaults for new shapes. When something is selected, the properties panel shows the selection's values, and a change both updates the selected objects and the defaults. Text uses `fill` for its colour, so the panel maps "stroke" ↔ `fill` for text objects in one place (`readSelection` / `applyPatch`).

## Theming

CSS variables define every colour (`:root` and `[data-theme="dark"]`). A small inline script in `<head>` sets the theme before first paint, so there is no flash. The canvas layer gets `filter: invert(93%) hue-rotate(180deg)` in dark mode: stored object colours are never touched, black ink shows as light ink, and hues stay close to the original. Mermaid always renders with a light theme and relies on the same filter.

## Mermaid pipeline

Mermaid is loaded with a dynamic `import()` only when the dialog opens. Code is validated with `mermaid.parse`, rendered to SVG with `htmlLabels: false` (so there is no `foreignObject`, which breaks when an SVG is drawn as an image), given explicit pixel dimensions, and inserted with `FabricImage.fromURL(data:image/svg+xml…)`. Result: one crisp, resizable object.

## Persistence schema

```
canvases/{canvasId}
  title:     string
  data:      string     // canvas.toJSON(), stringified
  createdAt: timestamp
  updatedAt: timestamp
```

Rules cap `data` at 900 KB to stay under Firestore's 1 MB document limit. Embedded Mermaid SVGs count toward this.

Recent canvases (`id`, `title`, `openedAt`) are in `localStorage`, exposed through `useSyncExternalStore` so the list is SSR-safe and updates across tabs.

## Problems solved along the way

| Problem | Fix |
|---|---|
| Fabric crashes during Next.js server render | Editor loaded with `dynamic(..., { ssr: false })` |
| Two canvases / "already initialised" in StrictMode | Create the `<canvas>` imperatively, `dispose()` in cleanup |
| Empty canvas overwriting saved data | Save disabled until initial load completes |
| Delete key removing an object while typing in it | Shortcut handler ignores inputs and Fabric's hidden textarea |
| `Space`-pan breaking the pen tool | One `syncMode()` function decides drawing mode, cursor and hit-testing from (tool, space held) |
| Invisible text in dark mode | All colours come from theme tokens, never hardcoded |
| Lint rules (React Compiler) rejecting effect-time `setState` and ref reads | Remount by `key`, `useSyncExternalStore`, Fabric mutations moved out of the hook body |

## Where I'd take it next

Per-object documents (or patches) would remove the 1 MB ceiling and let two people edit without overwriting each other. That is also the step that unlocks real-time collaboration and per-object undo. It trades the simplicity of one JSON blob for a harder sync problem, which was the right trade to defer for this scope.