# 🧠 BrainRust

A fast, cross-platform mind mapping application built with **Tauri + Rust + Canvas**.

> **Why "BrainRust"?** It's a playful mashup of *brainstorm* and *brainrot* — but with a twist: **rot → rust**, because this app is powered by Rust! 🦀

## ✨ Features

- **FreeMind Compatible** — Open and save `.mm` files compatible with FreeMind
- **Icon Support** — 60+ built-in icons rendered as emojis
- **Keyboard Navigation** — Arrow keys, Tab/Enter for node creation, F2 to rename
- **Canvas Rendering** — Smooth, hardware-accelerated 2D rendering
- **Native Menus** — Standard File/Edit/Help menus with keyboard shortcuts
- **Cross-Platform** — Runs on Windows, macOS, and Linux

## 📦 Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://rustup.rs/) (stable)
- Platform-specific dependencies (see below)

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/BrainRust.git
cd BrainRust

# Fetch submodules (brain_core lives here)
git submodule update --init --recursive

# Install dependencies
npm install

# Run in development mode
npm run tauri dev
```

## 🔨 Building for Production

### Windows

```bash
npm run tauri build
```

Output: `src-tauri/target/release/bundle/msi/` (installer) and `src-tauri/target/release/tauri-app.exe`

### macOS

```bash
npm run tauri build
```

Output: `src-tauri/target/release/bundle/dmg/` (.dmg) and `src-tauri/target/release/bundle/macos/` (.app)

### Linux

First, install required system dependencies:

```bash
# Debian/Ubuntu
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev

# Fedora
sudo dnf install webkit2gtk4.1-devel openssl-devel curl wget file libappindicator-gtk3-devel librsvg2-devel

# Arch
sudo pacman -S webkit2gtk-4.1 base-devel curl wget file openssl appmenu-gtk-module libappindicator-gtk3 librsvg
```

Then build:

```bash
npm run tauri build
```

Output: `src-tauri/target/release/bundle/deb/` (.deb), `src-tauri/target/release/bundle/appimage/` (.AppImage)

## ⌨️ Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| New Map | `Ctrl+N` |
| Open | `Ctrl+O` |
| Save | `Ctrl+S` |
| Add Child | `Tab` / `Insert` |
| Add Sibling | `Enter` |
| Delete Node | `Delete` |
| Rename Node | `F2` |
| Navigate | Arrow Keys |

## 🛠️ Tech Stack

- **Frontend**: TypeScript, HTML5 Canvas
- **Backend**: Rust, Tauri 2.0
- **Storage**: FreeMind XML format (.mm)

## 📄 License

MIT

---

Made with 🦀 and ☕
