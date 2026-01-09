# BrainRust Agent Notes

This file is for contributors/agents working in this repo: key architecture facts, where things live, and how to validate changes.

## Fast Validation

- Frontend unit tests: `npm run test`
- Frontend dev server: `npm run dev`
- Rust checks (Tauri backend): `cargo check` (run from `src-tauri/`)

Keep changes small and run the relevant check after each change.

## Current Architecture (2026)

BrainRust is a Tauri v2 desktop app with a **thick client frontend**:

- **Frontend is the source of truth** for active mind map state and tab state.
- **Rust backend is infrastructure**: native window/menu integration + local file I/O + parsing/serialization for supported formats.
- **Cloud persistence** uses Supabase from the frontend.

### Frontend stack

- Preact + TypeScript
- Tailwind CSS + DaisyUI themes (`src/index.css`)
- Canvas-based renderer with an HTML input overlay for node editing
- Vitest test suite

### Frontend layering (Clean/Hex)

`src/app/` is split by layers:

- `src/app/domain/`: pure domain logic (mind map model, layout, geometry)
- `src/app/application/`: use cases + app state + ports
- `src/app/presentation/`: Preact UI, hooks, theming, canvas rendering
- `src/app/infrastructure/`: adapters (Tauri, Supabase)

### Key frontend modules

- Composition root: `src/app/presentation/App.tsx`
- Canvas renderer + hit testing: `src/app/presentation/hooks/useCanvasRenderer.ts`
  - Uses a **render plan** builder (`src/app/presentation/rendering/renderPlan.ts`) for deterministic drawing.
  - Uses cached background + overlay redraw (selected node) for faster selection changes.
  - Uses compositor helper (`src/app/presentation/rendering/canvasCompositor.ts`) to avoid DPR double-scaling when blitting.
- Node editor overlay state: `src/app/presentation/hooks/useNodeEditorState.ts`
  - Driven by a small state machine (`src/app/presentation/stateMachines/editorMachine.ts`).
- Tab lifecycle guard: `src/app/application/state/tabLifecycle.ts` (prevents re-entrant create/close flows).

## Notes / Pitfalls

- Canvas DPR: when drawing an offscreen canvas onto the main canvas, reset transform to identity for the draw and restore afterward (see `drawBackgroundImage`).
- Flex layout: the main canvas container should allow shrinking (`min-h-0`) so the tab bar stays visible.
