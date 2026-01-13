# BrainRust Project Context

## Project Overview
**BrainRust** is a fast, cross-platform mind mapping application.
- **Stack:** Tauri v2 (Rust Backend) + Preact (TypeScript Frontend).
- **Core Features:** FreeMind (.mm) support, Canvas-based rendering, Native menus, Cloud persistence (Supabase).
- **Goal:** High-performance, native-feeling desktop app with a "thick-client" architecture.

## Architecture (Hexagonal / Clean)
The frontend (`src/app/`) is the source of truth for application state and follows strict layering:

1.  **Domain** (`src/app/domain/`):
    - Pure business logic (MindMap model, Layout algorithms, Geometry).
    - No dependencies on framework or infrastructure.
2.  **Application** (`src/app/application/`):
    - Use cases, App State (`TabState`), and Ports (Interfaces).
    - Orchestrates logic but doesn't know about UI or DB.
3.  **Presentation** (`src/app/presentation/`):
    - Preact Components, Hooks, and Canvas Rendering.
    - Consumes Application layer. **Should not** import Infrastructure directly.
4.  **Infrastructure** (`src/app/infrastructure/`):
    - Adapters for External Services: Tauri (File I/O, Dialogs), Supabase (Cloud).
    - Implements Ports defined in Application layer.

### Rendering System
- **Canvas:** Immediate-mode rendering via a custom `useCanvasRenderer` hook.
- **Optimization:** Uses a **Render Plan** (`src/app/presentation/rendering/renderPlan.ts`) and offscreen caching (background vs. overlay) to minimize redraws.
- **Compositor:** `canvasCompositor.ts` handles DPR-safe blitting.

## Development & Verification

### Commands
- **Install Dependencies:** `npm install`
- **Run Dev (Tauri):** `npm run tauri dev`
- **Frontend Tests (Vitest):** `npm run test`
- **Rust Checks:** `cd src-tauri && cargo check`
- **Build Production:** `npm run tauri build`

### Guidelines
- **Small Iterations:** Make small changes and verify frequently.
- **Validation:** Always run `npm run test` (frontend) or `cargo check` (backend) after changes.
- **Architecture:** Respect the Hexagonal layers.
    - **DO NOT** import `infrastructure` from `presentation`. Use `application` ports instead.
    - **DO NOT** put business logic in UI components. Use `application/usecases`.

## Current State & Refactoring
- **Active Plan:** Moving towards strict Hexagonal Architecture (see `REFACTOR_PLAN.md`).
- **Known Violations:** Some Presentation hooks currently import Supabase infrastructure directly. This is being refactored to use Ports/Adapters.
