# Frontend Overview (Preact + TypeScript)

This document describes the current BrainRust frontend implementation and where to make changes.

## Quick Commands

- Install deps: `npm install`
- Run dev: `npm run dev`
- Run unit tests (Vitest): `npm run test`

## Architecture Summary

BrainRust uses a **thick-client** frontend with Clean/Hex layering:

- **Domain** (`src/app/domain/`): pure logic (mind map operations, layout, geometry).
- **Application** (`src/app/application/`): use cases, app state, and ports (DI for testing).
- **Presentation** (`src/app/presentation/`): Preact UI, hooks, theming, canvas rendering.
- **Infrastructure** (`src/app/infrastructure/`): adapters for Tauri and Supabase.

The frontend owns active state (`AppState`/`TabState`). Rust is used for native features and local file format parsing/serialization.

## State & Use Cases

- App state: `src/app/application/state/tabState.ts`
- Use cases: `src/app/application/usecases/*`
- Use cases return `UsecaseResult` which may include `render` instructions for the canvas.

There are small reducers/state-machines used to prevent UI races:

- Tab lifecycle guard: `src/app/application/state/tabLifecycle.ts`
- Node editor state machine: `src/app/presentation/stateMachines/editorMachine.ts`

## Rendering Pipeline

Canvas rendering is immediate-mode but structured to be testable and performant:

- Render plan builder (pure): `src/app/presentation/rendering/renderPlan.ts`
  - Unit tests: `src/app/presentation/rendering/renderPlan.test.ts`
- Canvas compositor helper (DPR-safe blitting): `src/app/presentation/rendering/canvasCompositor.ts`
  - Unit tests: `src/app/presentation/rendering/canvasCompositor.test.ts`
- Hook that owns the canvas context, measurement, and drawing:
  - `src/app/presentation/hooks/useCanvasRenderer.ts`

### Incremental redraw strategy

`useCanvasRenderer` maintains a cached offscreen “background” (edges + unselected nodes). On selection-only changes it redraws only a small overlay (selected node) on top.

Important: When blitting the cached canvas onto the main canvas, the compositor resets transforms to avoid double-applying `devicePixelRatio`.

## UI Composition

- Composition root: `src/app/presentation/App.tsx`
  - Wires dependencies, hooks, and dialogs.
- Tabs: `src/app/presentation/components/TabBar.tsx`
- Canvas view wrapper: `src/app/presentation/components/CanvasView.tsx`
- Editor overlay: `src/app/presentation/components/NodeEditor.tsx`
  - Enter/Escape are handled inside the input to prevent propagation to global shortcuts.

## Styling & Theming

- Tailwind + DaisyUI: `src/index.css`
- Fonts: `src/fonts.css` + bundled assets in `src/assets/fonts/`
- Theme selection is persisted via localStorage and DaisyUI theme controller input.
