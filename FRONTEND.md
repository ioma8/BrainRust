# Frontend Analysis (TypeScript)

This document provides a comprehensive analysis of the BrainRust frontend codebase.

## 1. High-Level Architecture

BrainRust employs a **Thick Client** architecture where the frontend is the source of truth for the active application state. It follows the principles of **Clean Architecture** (Hexagonal Architecture) to separate concerns.

- **Framework**: [Preact](https://preactjs.com/) (lightweight React alternative).
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with [DaisyUI](https://daisyui.com/) and CSS variables for theming.
- **Build Tool**: [Vite](https://vitejs.dev/).
- **Language**: TypeScript.

### Directory Structure
The `src/app` directory is organized by architectural layers:

| Layer | Path | Responsibilities |
|-------|------|------------------|
| **Presentation** | `src/app/presentation/` | UI components, hooks, themes, constants. |
| **Application** | `src/app/application/` | Business logic (use cases), application state definitions, ports. |
| **Domain** | `src/app/domain/` | Core business logic, data structures, layout algorithms. Pure TS, no side effects. |
| **Infrastructure** | `src/app/infrastructure/` | Adapters for external systems (Tauri, Supabase). |

## 2. Core Logic & Domain (`src/app/domain`)

The domain layer is pure TypeScript and contains no UI-specific code.

- **MindMap Model** (`mindmap.ts`):
  - **Structure**: A flat normalized store (`Record<string, Node>`) with a `root_id`.
  - **Immutability**: Operations like `addChild`, `removeNode`, and `changeNode` return a new `MindMap` object (copy-on-write), ensuring React/Preact reactivity works predictably.
  - **Node**: Contains data (`content`, `icons`, timestamps) and structural links (`parent`, `children` IDs).
- **Layout Engine** (`layout/`):
  - **Algorithm**: A recursive tree layout algorithm (`layoutNode`, `layoutChildren`).
  - **Responsibility**: Calculates `x`/`y` coordinates for all nodes based on their content size.
  - **Separation**: Layout is computed separately from rendering. `computeLayout` takes a `MindMap` and returns a new one with updated coordinates.

## 3. Application Layer (`src/app/application`)

This layer acts as the glue between the UI and the Domain.

- **Use Cases**: Implemented as standalone async functions (e.g., `addNode`, `saveMap`).
  - They accept the current `AppState` and a set of `AppDependencies`.
  - They return a `UsecaseResult` containing the new state and optional render instructions.
- **State Management**:
  - **Pattern**: Custom functional state updates.
  - **State Object**: `AppState` holds a list of `TabState` and the `activeTabId`.
  - **Dependency Injection**: Use cases receive dependencies (layout engine, file system ports) to allow for easier testing.

## 4. Presentation Layer (`src/app/presentation`)

### Rendering Strategy (`useCanvasRenderer.ts`)
BrainRust uses **Immediate Mode Rendering** on an HTML5 Canvas for performance.
- **Canvas**: Drawn using the standard 2D Context API.
- **Optimizations**: Handles `window.devicePixelRatio` for sharp text on high-DPI screens.
- **Text Measurement**: Uses an off-screen or the main canvas context to measure text width for layout calculations.
- **Hit Testing**: `getNodeAt` maps mouse coordinates to nodes for interaction.

### Key Components
- **`App.tsx`**: The **Composition Root**.
  - Holds the main `useState` and `useRef` for the application.
  - Wires up event listeners (keyboard, window resize, Tauri menu events).
  - Dispatches actions to Use Cases.
- **`CanvasView.tsx`**: A thin wrapper around the `<canvas>` element.
- **`NodeEditor.tsx`**: An HTML `<input>` element that floats **over** the canvas at the absolute position of the selected node. This allows for native text editing capabilities (selection, copy/paste) without reimplementing a text editor inside Canvas.

## 5. Infrastructure & Backend Integration

### Tauri Bridge (`src/app/infrastructure/tauri`)
The frontend communicates with the Rust backend via `invoke` calls wrapped in adapters.
- **Persistence**: `mapFileApi.ts` calls `load_map_file` and `save_map_file`.
  - **Note**: The actual file parsing (JSON, XML, binary) happens in Rust, but the *active* object model lives in TypeScript.
- **Dialogs**: Wrappers for native OS dialogs.
- **Menus**: Listens for global menu events (e.g., "File > Save") emitted by the Rust backend.

### Cloud (`src/app/infrastructure/supabase`)
- Implements `cloudApi.ts` for authentication and CRUD operations on MindMaps stored in Supabase.

## 6. Discrepancies from Initial Assumptions

- **Ownership**: The initial project description suggested the Rust backend "owns the map". The code analysis reveals that the **Frontend** owns the active map state. Rust is primarily used for:
  1.  File System I/O and Format Conversion (parsing `.xmind`, `.mm`, etc. into the internal JSON structure).
  2.  Native capabilities (Menu, Window).
- **Logic**: Node manipulation logic (add, remove, sibling) is implemented in TypeScript (`src/app/domain/mindmap/mindmap.ts`), not Rust.

## 7. Deep Analysis & Recommendations

### Code Quality & Patterns
- **God Component (`App.tsx`)**: This file is over 900 lines long and violates the Single Responsibility Principle. It manages state, effects, event listeners, and UI composition.
  - *Recommendation*: Refactor into custom hooks (`useKeyboardShortcuts`, `useMenuHandler`, `useCloudSync`) to isolate logic.
- **Manual Dependency Injection**: The `deps` object is recreated on every render in `App.tsx`.
  - *Recommendation*: Use a Context API or a stable `const deps` reference to avoid unnecessary object creation.
- **Render Loop**: `useCanvasRenderer` re-renders the entire tree on any state change.
  - *Recommendation*: While Canvas is fast, this will become a bottleneck. No immediate action needed for < 500 nodes, but keep in mind.

### Desktop UI/UX Gaps
- **Missing Undo/Redo**: There is no Undo/Redo stack. This is a critical feature for a desktop editor.
  - *Recommendation*: Implement a history stack in `AppState` (`past`, `future` arrays) to leverage the immutable data model.
- **Zooming**: There is no support for zooming (Ctrl+Scroll).
  - *Recommendation*: Add a `scale` property to `TabState` and apply `ctx.scale()` in the renderer.
- **Context Menus**: Right-click interactions are missing.
  - *Recommendation*: Add a native-feeling HTML context menu overlay.
- **Performance (Culling)**: The renderer loops through all nodes even if they are off-screen.
  - *Recommendation*: Implement simple viewport culling in `renderCanvas`.
- **Hit Testing**: `getNodeAt` iterates linearly ($O(N)$).
  - *Recommendation*: Reverse loop for z-order correctness (top items first) and consider spatial partitioning if N grows large.

### Summary of Suggested Improvements
1.  **Refactor `App.tsx`**: Extract logic into hooks.
2.  **Implement Undo/Redo**: Add history management.
3.  **Add Zoom Support**: enhance canvas renderer.
4.  **Implement Viewport Culling**: Don't draw off-screen nodes.
