# BrainRust Project Analysis

## 1. Current Codebase
BrainRust is a desktop mind-mapping application built with **Tauri v2**. It pairs a Rust backend that owns the map data with a lightweight, vanilla TypeScript frontend that renders directly to Canvas. The UI supports file import/export for multiple mind map formats, emoji-based icons, and native menus.

## 2. Crates Used

### Backend (Rust)
- **`tauri` (v2)**: Core desktop shell and command system.
- **`tauri-plugin-dialog`**: Native open/save dialogs.
- **`tauri-plugin-opener`**: OS-level file opening support.
- **`serde` & `serde_json`**: Serialization between Rust and TypeScript.
- **`brain_core`**: Local workspace crate for core domain logic and file formats.
  - **`quick-xml`**: FreeMind (`.mm`) XML parsing/serialization.
  - **`zip`**: XMind (`.xmind`) zip archive handling.
  - **`uuid`**: Node ID generation.

### Frontend (Web)
- **`@tauri-apps/api`**: Tauri IPC, events, and window control.
- **`@tauri-apps/plugin-dialog`**: Frontend bindings for open/save dialogs.
- **`typescript`**: Type-safe frontend development.
- **`vite`**: Build tool and dev server.

## 3. Coding Style

### Rust (Backend)
- **Modular Design**: Core logic lives in `brain_core`, while `src-tauri/src` is focused on commands and app setup.
- **State Management**: `AppState` wraps the `MindMap` and current file path in `Mutex` for safe access from commands.
- **Error Handling**: Commands return `Result<T, String>` for front-end error reporting.
- **Data Structures**: `MindMap` and `Node` are `serde`-enabled; nodes carry timestamps and icon IDs, while layout coordinates are stored but computed in the frontend.

### TypeScript (Frontend)
- **Vanilla Implementation**: No UI framework; rendering is Canvas-based with DOM overlays for editing.
- **Event-Driven**: Keyboard, mouse, and menu events drive mutations through Tauri commands.
- **Layout in Frontend**: `computeLayout()` and `getNodeWidth()` use Canvas measurements to position nodes, keeping layout logic close to rendering.
- **Type Safety**: Interfaces in `types.ts` mirror Rust structs.

## 4. Project Structure

```
BrainRust/
├── src/                    # Frontend Source
│   ├── main.ts             # Canvas logic, layout, event handling
│   ├── types.ts            # TypeScript interfaces (MindMap, Node)
│   └── styles.css          # Global styles
├── src-tauri/              # Backend Source
│   ├── src/                # Tauri Application Layer
│   │   ├── lib.rs          # Commands, menu setup, state
│   │   └── main.rs         # Entry point
│   ├── brain_core/         # Core Domain Logic (Local Crate)
│   │   ├── src/
│   │   │   ├── lib.rs      # Data structures + map operations
│   │   │   ├── storage.rs  # FreeMind (.mm) import/export
│   │   │   ├── xmind.rs    # XMind (.xmind) import/export
│   │   │   ├── opml.rs     # OPML import/export
│   │   │   ├── mmap.rs     # MindManager (.mmap) import/export
│   │   │   ├── mindnode.rs # MindNode (.mindnode) import/export
│   │   │   └── smmx.rs     # SimpleMind (.smmx) import/export
│   │   └── Cargo.toml
│   ├── Cargo.toml          # Main workspace dependencies
│   └── tauri.conf.json     # Tauri configuration
├── package.json            # Frontend dependencies
└── vite.config.ts          # Build configuration
```

## 5. Implemented Functionality

- **Mind Map Management**:
  - Create new maps and track dirty state + current file path.
  - Load/save FreeMind (`.mm`), XMind (`.xmind`), OPML (`.opml`), MindManager (`.mmap`), MindNode (`.mindnode`), and SimpleMind (`.smmx`) files (SMMX zip archives are not supported).
- **Node Operations**:
  - Add child or sibling nodes.
  - Edit node content via a floating input editor.
  - Remove nodes (recursive subtree delete).
  - Select nodes via mouse click.
  - Add/remove icon markers per node (rendered as emoji).
- **Navigation & UI**:
  - Keyboard navigation (arrow keys), creation (Enter/Insert), rename (F2), delete (Delete).
  - Canvas panning by mouse drag; fit-to-view on load.
  - Native menu actions wired to frontend via Tauri events.
- **Rendering & Layout**:
  - Canvas redraw per state update.
  - Layout computed on the frontend using actual font metrics.

## 6. Architecture

The application follows a **Backend-Driven State** architecture with frontend-driven layout:

1. **Source of Truth**: The `MindMap` in Rust `AppState` is authoritative, along with the current file path.
2. **Command Pattern**: Frontend issues Tauri commands (`add_child`, `save_map`, `add_icon`, etc.) to mutate state.
3. **State Synchronization**: After mutations, the frontend calls `get_map` and re-renders the canvas.
4. **Layout Ownership**: Node positions are computed in the frontend, where Canvas text metrics are available.
5. **Core Isolation**: The `brain_core` crate is independent of Tauri and encapsulates data structures plus import/export logic.
