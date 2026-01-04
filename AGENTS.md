# BrainRust Project Analysis

## 1. Current Codebase
BrainRust is a desktop mind-mapping application built using **Tauri v2**. It combines a high-performance Rust backend with a lightweight, vanilla TypeScript frontend. The application focuses on speed and simplicity, avoiding heavy frontend frameworks in favor of direct Canvas API manipulation.

## 2. Crates Used

### Backend (Rust)
- **`tauri` (v2)**: The core framework for building the desktop application.
- **`tauri-plugin-*`**: Official plugins for dialogs, process management, and file opening.
- **`serde` & `serde_json`**: For serialization and deserialization of data between Rust and TypeScript.
- **`brain_core`**: A local workspace crate containing the core domain logic.
  - **`quick-xml`**: For parsing and serializing FreeMind (`.mm`) XML files.
  - **`zip`**: For reading and writing XMind (`.xmind`) files (which are zipped archives).
  - **`uuid`**: For generating unique identifiers for mind map nodes.

### Frontend (Web)
- **`@tauri-apps/api`**: For communicating with the Rust backend.
- **`typescript`**: For type-safe frontend development.
- **`vite`**: The build tool and development server.

## 3. Coding Style

### Rust (Backend)
- **Modular Design**: Core logic is separated into a dedicated `brain_core` library crate, keeping the Tauri interface layer (`src-tauri/src`) thin and focused on command handling.
- **State Management**: Uses `std::sync::Mutex` within Tauri's `State` management to handle concurrent access to the `MindMap` data.
- **Error Handling**: Extensive use of `Result<T, String>` to propagate errors to the frontend.
- **Data Structures**: Strongly typed structs (`MindMap`, `Node`) with `serde` derivation for seamless JSON conversion.

### TypeScript (Frontend)
- **Vanilla Implementation**: No UI frameworks (React, Vue, etc.). Uses direct DOM manipulation and the HTML5 Canvas API for rendering.
- **Event-Driven**: Relies on event listeners for keyboard and mouse interactions.
- **Imperative Rendering**: The `render()` function clears and redraws the entire canvas based on the current state.
- **Type Safety**: Shared interfaces in `types.ts` mirror the Rust structs.

## 4. Project Structure

```
BrainRust/
├── src/                    # Frontend Source
│   ├── main.ts             # Main entry point, canvas logic, event handling
│   ├── types.ts            # TypeScript interfaces (MindMap, Node)
│   └── styles.css          # Global styles
├── src-tauri/              # Backend Source
│   ├── src/                # Tauri Application Layer
│   │   ├── lib.rs          # Command definitions and state setup
│   │   └── main.rs         # Entry point
│   ├── brain_core/         # Core Domain Logic (Local Crate)
│   │   ├── src/
│   │   │   ├── lib.rs      # Data structures (MindMap, Node)
│   │   │   ├── storage.rs  # XML (FreeMind) import/export
│   │   │   └── xmind.rs    # XMind import/export
│   │   └── Cargo.toml
│   ├── Cargo.toml          # Main workspace dependencies
│   └── tauri.conf.json     # Tauri configuration
├── package.json            # Frontend dependencies
└── vite.config.ts          # Build configuration
```

## 5. Implemented Functionality

- **Mind Map Management**:
  - Create new maps.
  - Load and Save maps in FreeMind (`.mm`) and XMind (`.xmind`) formats.
- **Node Operations**:
  - Add child and sibling nodes.
  - Edit node content via an overlay input field.
  - Remove nodes (and their subtrees).
  - Select nodes via mouse click.
- **Navigation**:
  - Keyboard navigation (Arrow keys) to traverse the tree.
  - Canvas panning (drag to move view).
- **Layout**:
  - Automatic layout computation (implied by `compute_layout` calls in Rust, though specific algorithm details reside in `brain_core`).

## 6. Architecture

The application follows a **Backend-Driven State** architecture:

1.  **Source of Truth**: The `MindMap` struct held in the Rust `AppState` is the single source of truth.
2.  **Command Pattern**: The frontend invokes Tauri commands (`add_child`, `change_node`, `navigate`) to request state changes.
3.  **State Synchronization**:
    - Mutating commands return the result or trigger a state update.
    - The frontend fetches the updated state via `get_map` and re-renders the canvas.
4.  **Core Isolation**: The `brain_core` crate is designed to be independent of Tauri, potentially allowing the core logic to be reused in other contexts (e.g., a CLI tool or a web-only WASM version).
