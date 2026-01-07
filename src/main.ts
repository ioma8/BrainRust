import { invoke } from "@tauri-apps/api/core";
import { save, open, ask, confirm } from '@tauri-apps/plugin-dialog';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { MindMap, Node } from "./types";
import "./fonts.css";

const canvas = document.getElementById("mindmap-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const editor = document.getElementById("node-editor") as HTMLInputElement;
const sidebarEl = document.getElementById("sidebar") as HTMLElement;

const NODE_HEIGHT = 30;
let sidebarWidth = sidebarEl?.offsetWidth || 40;

const H_GAP = 50;
const V_GAP = 20;
const MIN_NODE_WIDTH = 100;
const NODE_FONT = '14px "Inter", sans-serif';
const NODE_FONT_LOAD = '14px "Inter"';

let mindMap: MindMap | null = null;
let offset = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
let isEditing = false;
let isDragging = false;
let dragStart = { x: 0, y: 0 };
let lastOffset = { x: 0, y: 0 };

// Lifecycle State
let currentFilePath: string | null = null;
let isDirty = false;

const appWindow = getCurrentWindow();

// --- Lifecycle Helpers ---

async function updateTitle() {
  let title = "BrainRust";
  if (currentFilePath) {
    // Extract filename from path (basic splitting)
    const name = currentFilePath.split(/[\\/]/).pop() || currentFilePath;
    title = `${name}`;
  } else {
    title = "Untitled";
  }

  if (isDirty) {
    title += "*";
  }

  try {
    await appWindow.setTitle(title);
  } catch (e) {
    console.error("Failed to set title", e);
  }
}

async function markDirty() {
  if (!isDirty) {
    isDirty = true;
    await updateTitle();
  }
}

async function ensureFontsLoaded() {
  if (!document.fonts) return;
  try {
    await document.fonts.load(NODE_FONT_LOAD);
    await document.fonts.ready;
  } catch (e) {
    console.warn("Failed to load fonts", e);
  }
}

async function loadMapState(fit = false) {
  try {
    mindMap = await invoke<MindMap>("get_map");
    computeLayout();
    render();
    if (fit) fitView();
  } catch (e) {
    console.error("Failed to load map:", e);
  }
}

function computeLayout() {
  if (!mindMap) return;
  const rootId = mindMap.root_id;
  const prevRoot = mindMap.nodes[rootId];
  const prevX = prevRoot?.x ?? 0;
  const prevY = prevRoot?.y ?? 0;

  layoutNode(rootId, 0, 0);

  // Keep the root anchored so adding/removing nodes doesn't cause the whole tree
  // to "jump" vertically or horizontally.
  const nextRoot = mindMap.nodes[rootId];
  if (!nextRoot) return;
  const dx = prevX - nextRoot.x;
  const dy = prevY - nextRoot.y;
  if (dx !== 0 || dy !== 0) {
    for (const node of Object.values(mindMap.nodes)) {
      node.x += dx;
      node.y += dy;
    }
  }
}

function layoutNode(nodeId: string, x: number, startY: number): number {
  if (!mindMap) return NODE_HEIGHT + V_GAP;
  const node = mindMap.nodes[nodeId];
  if (!node) return NODE_HEIGHT + V_GAP;

  const rowH = NODE_HEIGHT + V_GAP;
  const children = node.children || [];
  const nodeW = Math.max(getNodeWidth(node), MIN_NODE_WIDTH);

  if (children.length === 0) {
    node.x = x;
    node.y = startY;
    return rowH;
  }

  const childX = x + nodeW + H_GAP;

  let currentY = startY;
  for (const childId of children) {
    if (!mindMap.nodes[childId]) continue;
    const h = layoutNode(childId, childX, currentY);
    currentY += h;
  }

  const totalH = Math.max(currentY - startY, rowH);
  node.x = x;
  // Center parent within children cluster; keep parent aligned with child when only one.
  node.y = startY + (totalH - rowH) / 2;
  return totalH;
}

// --- File Operations ---

async function createNewMap() {
  if (isDirty) {
    const yes = await ask("You have unsaved changes. Discard them?", { kind: 'warning', title: 'Unsaved Changes' });
    if (!yes) return;
  }

  try {
    mindMap = await invoke<MindMap>("new_map");
    currentFilePath = null;
    isDirty = false;
    await updateTitle();
    computeLayout();
    render();
    fitView();
  } catch (e) {
    console.error(e);
  }
}

async function openMap() {
  if (isDirty) {
    const yes = await ask("You have unsaved changes. Discard them?", { kind: 'warning', title: 'Unsaved Changes' });
    if (!yes) return;
  }

  try {
    const path = await open({
      multiple: false,
      directory: false,
      filters: [
        { name: 'MindMap Files', extensions: ['mm', 'xmind', 'opml', 'mmap', 'mindnode', 'smmx'] },
        { name: 'FreeMind', extensions: ['mm'] },
        { name: 'XMind', extensions: ['xmind'] },
        { name: 'OPML', extensions: ['opml'] },
        { name: 'MindManager', extensions: ['mmap'] },
        { name: 'MindNode', extensions: ['mindnode'] },
        { name: 'SimpleMind', extensions: ['smmx'] }
      ]
    });

    if (path) {
      await invoke("load_map", { path });
      currentFilePath = path;
      isDirty = false;
      await loadMapState(true);
      await updateTitle();
    }
  } catch (e) {
    console.error(e);
  }
}

async function saveMap(saveAs = false) {
  try {
    let path = currentFilePath;

    if (saveAs || !path) {
      path = await save({
        filters: [
          { name: 'FreeMind', extensions: ['mm'] },
          { name: 'XMind', extensions: ['xmind'] },
          { name: 'OPML', extensions: ['opml'] },
          { name: 'MindManager', extensions: ['mmap'] },
          { name: 'MindNode', extensions: ['mindnode'] },
          { name: 'SimpleMind', extensions: ['smmx'] }
        ],
        defaultPath: currentFilePath || undefined
      });
    }

    if (path) {
      const savedPath = await invoke<string>("save_map", { path });
      currentFilePath = savedPath;
      isDirty = false;
      await updateTitle();
    }
  } catch (e) {
    console.error("Save failed:", e);
  }
}

// --- Menu Listener ---
// --- Menu Listener ---
listen("menu-event", async (event) => {
  const action = event.payload as string;
  switch (action) {
    case "new": createNewMap(); break;
    case "open": openMap(); break;
    case "save": saveMap(false); break;
    case "save_as": saveMap(true); break;
    case "exit": appWindow.close(); break;

    case "add_child":
      if (mindMap) {
        const newId = await invoke<string>("add_child", { parentId: mindMap.selected_node_id, content: "New Node" });
        await markDirty();
        await invoke("select_node", { nodeId: newId });
        await loadMapState();
        ensureVisible(newId);
        startEdit();
      }
      break;
    case "add_sibling":
      if (mindMap && mindMap.selected_node_id !== mindMap.root_id) {
        const newId = await invoke<string>("add_sibling", { nodeId: mindMap.selected_node_id, content: "New Node" });
        await markDirty();
        await invoke("select_node", { nodeId: newId });
        await loadMapState();
        ensureVisible(newId);
        startEdit();
      }
      break;
    case "delete_node":
      if (mindMap && mindMap.selected_node_id !== mindMap.root_id) {
        await invoke("remove_node", { nodeId: mindMap.selected_node_id });
        await markDirty();
        await loadMapState();
      }
      break;
    case "rename_node":
      startEdit();
      break;

    case "about":
      await ask("BrainRust v0.1.0\n\nA FreeMind-compatible mind mapping tool built with Tauri + Rust + Canvas.", { title: "About BrainRust", kind: 'info' });
      break;
  }
});

// --- Close Listener ---
appWindow.onCloseRequested(async (event) => {
  if (isDirty) {
    // Prevent the close
    event.preventDefault();

    // Ask user
    const confirmed = await confirm("You have unsaved changes. Are you sure you want to exit?", { kind: 'warning', title: 'Unsaved Changes' });

    if (confirmed) {
      // Force close by destroying the window
      await appWindow.destroy();
    }
  }
  // If not dirty, don't prevent - window closes normally
});


// --- Icon Mapping ---
const iconMap: { [key: string]: string } = {
  "idea": "💡",
  "help": "❓",
  "yes": "✔️",
  "messagebox_warning": "⚠️",
  "stop-sign": "🛑",
  "closed": "⛔",
  "info": "ℹ️",
  "button_ok": "✅",
  "button_cancel": "❌",
  "full-1": "1️⃣",
  "full-2": "2️⃣",
  "full-3": "3️⃣",
  "full-4": "4️⃣",
  "full-5": "5️⃣",
  "full-6": "6️⃣",
  "full-7": "7️⃣",
  "full-8": "8️⃣",
  "full-9": "9️⃣",
  "full-0": "0️⃣",
  "stop": "�",
  "prepare": "🟡",
  "go": "🟢",
  "back": "⬅️",
  "forward": "➡️",
  "up": "⬆️",
  "down": "⬇️",
  "attach": "📎",
  "ksmiletris": "😀",
  "smiley-neutral": "😐",
  "smiley-oh": "😮",
  "smiley-angry": "😠",
  "smily_bad": "😞",
  "clanbomber": "💣",
  "desktop_new": "🖥️",
  "gohome": "�",
  "folder": "📁",
  "korn": "📦",
  "Mail": "✉️",
  "kmail": "📨",
  "list": "📋",
  "edit": "📝",
  "kaddressbook": "📒",
  "knotify": "📣",
  "password": "🔑",
  "pencil": "✏️",
  "wizard": "🧙",
  "xmag": "🔍",
  "bell": "🔔",
  "bookmark": "🔖",
  "penguin": "🐧",
  "licq": "💬",
  "freemind_butterfly": "🦋",
  "broken-line": "⚡",
  "calendar": "📅",
  "clock": "⏰",
  "hourglass": "⏳",
  "launch": "🚀",
  "flag-black": "🏴",
  "flag-blue": "💙",
  "flag-green": "💚",
  "flag-orange": "🧡",
  "flag-pink": "🩷",
  "flag": "🏳️",
  "flag-yellow": "💛",
  "family": "👪",
  "female1": "👩",
  "female2": "🚺",
  "male1": "👨",
  "male2": "🚹",
  "fema": "👗",
  "group": "👥",
  "trash": "🗑️" // Special for remove
};

const toolbarFixed = document.getElementById("toolbar-fixed")!;
const toolbarScrollable = document.getElementById("toolbar-scrollable")!;

function createIconBtn(key: string): HTMLElement {
  const btn = document.createElement("div");
  btn.className = "icon-btn";
  btn.textContent = iconMap[key];
  btn.title = key;
  btn.style.cursor = "pointer";
  btn.style.fontSize = "20px";
  btn.style.padding = "5px";
  btn.style.userSelect = "none";
  btn.onclick = async () => {
    if (!mindMap) return;
    const id = mindMap.selected_node_id;

    if (key === "trash") {
      await invoke("remove_last_icon", { nodeId: id });
    } else {
      await invoke("add_icon", { nodeId: id, icon: key });
    }
    await markDirty();
    await loadMapState();
  };
  return btn;
}

// --- Init Toolbar ---
// Fixed items (Trash)
if (iconMap["trash"]) {
  const btn = createIconBtn("trash");
  toolbarFixed.appendChild(btn);
}

// Scrollable items (Rest)
Object.keys(iconMap).forEach(key => {
  if (key === "trash") return;
  const btn = createIconBtn(key);
  toolbarScrollable.appendChild(btn);
});


// --- Rendering & Layout ---

function resize() {
  const dpr = window.devicePixelRatio || 1;
  sidebarWidth = sidebarEl?.offsetWidth || sidebarWidth;
  canvas.width = (window.innerWidth - sidebarWidth) * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = (window.innerWidth - sidebarWidth) + "px";
  canvas.style.height = window.innerHeight + "px";
  // Reset transform so repeated resizes don't accumulate scaling.
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  render();
}
window.addEventListener("resize", resize);

function render() {
  if (!mindMap) return;

  const width = window.innerWidth - sidebarWidth;
  const height = window.innerHeight;

  // Clear
  ctx.fillStyle = "#242424";
  ctx.fillRect(0, 0, width, height);

  // Draw Edges
  ctx.strokeStyle = "#888";
  ctx.lineWidth = 2;

  Object.values(mindMap.nodes).forEach(node => {
    if (node.parent && mindMap!.nodes[node.parent]) {
      const parent = mindMap!.nodes[node.parent];

      const pW = getNodeWidth(parent);
      const pH = NODE_HEIGHT;
      const cH = NODE_HEIGHT;

      const pCx = parent.x + offset.x + pW;
      const pCy = parent.y + offset.y + pH / 2;

      const cCx = node.x + offset.x;
      const cCy = node.y + offset.y + cH / 2;

      ctx.beginPath();
      ctx.moveTo(pCx, pCy);
      ctx.bezierCurveTo(pCx + 50, pCy, cCx - 50, cCy, cCx, cCy);
      ctx.stroke();
    }
  });

  // Draw Nodes
  Object.values(mindMap.nodes).forEach(node => {
    const isSelected = node.id === mindMap!.selected_node_id;
    drawNode(node, isSelected);
  });
}

function getNodeWidth(node: Node): number {
  ctx.font = NODE_FONT;
  const textW = ctx.measureText(node.content).width;
  const iconsW = (node.icons ? node.icons.length * 20 : 0);
  return textW + iconsW + 20; // 20 padding
}

function drawNode(node: Node, isSelected: boolean) {
  const w = getNodeWidth(node);
  const h = NODE_HEIGHT;
  const x = node.x + offset.x;
  const y = node.y + offset.y;

  // Background
  ctx.fillStyle = isSelected ? "#646cff" : "#3a3a3a";
  if (isSelected) {
    ctx.shadowColor = "rgba(100, 108, 255, 0.5)";
    ctx.shadowBlur = 10;
  } else {
    ctx.shadowBlur = 0;
  }

  roundRect(ctx, x, y, w, h, 5);
  ctx.fill();

  // Border
  ctx.strokeStyle = isSelected ? "#fff" : "#555";
  ctx.lineWidth = isSelected ? 2 : 1;
  ctx.stroke();

  // Text & Icons
  ctx.fillStyle = "#fff";
  ctx.font = NODE_FONT;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";

  let currentX = x + 10;

  // Draw Icons
  if (node.icons) {
    node.icons.forEach(iconName => {
      const emoji = iconMap[iconName] || "❓";
      ctx.fillText(emoji, currentX, y + h / 2 + 1); // +1 for visual baseline adj
      currentX += 20;
    });
  }

  ctx.fillText(node.content, currentX, y + h / 2);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fitView() {
  if (!mindMap) return;
  const nodes = Object.values(mindMap.nodes);
  if (nodes.length === 0) return;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  nodes.forEach(n => {
    const w = getNodeWidth(n);
    const h = NODE_HEIGHT;
    if (n.x < minX) minX = n.x;
    if (n.y < minY) minY = n.y;
    if (n.x + w > maxX) maxX = n.x + w;
    if (n.y + h > maxY) maxY = n.y + h;
  });

  const bboxW = maxX - minX;
  const bboxH = maxY - minY;

  const cx = minX + bboxW / 2;
  const cy = minY + bboxH / 2;
  const screenCx = (window.innerWidth - sidebarWidth) / 2;
  const screenCy = window.innerHeight / 2;

  offset.x = screenCx - cx;
  offset.y = screenCy - cy;

  render();
}

// --- Interaction Helpers ---

function screenToWorld(x: number, y: number) {
  // Input should be canvas-relative coordinates.
  return { x: x - offset.x, y: y - offset.y };
}

function getNodeAt(x: number, y: number): Node | null {
  if (!mindMap) return null;
  // Convert from window coords to canvas coords.
  const canvasX = x - sidebarWidth;
  const canvasY = y;

  const p = screenToWorld(canvasX, canvasY);
  for (const node of Object.values(mindMap.nodes)) {
    const w = getNodeWidth(node);
    const h = NODE_HEIGHT;
    if (p.x >= node.x && p.x <= node.x + w &&
      p.y >= node.y && p.y <= node.y + h) {
      return node;
    }
  }
  return null;
}

function ensureVisible(nodeId: string) {
  if (!mindMap) return;
  const node = mindMap.nodes[nodeId];
  if (!node) return;

  const w = getNodeWidth(node);
  const h = NODE_HEIGHT;

  const screenX = node.x + offset.x; // Canvas space
  const screenY = node.y + offset.y;

  const padding = 50;
  const viewportW = window.innerWidth - sidebarWidth;
  const viewportH = window.innerHeight;

  let dx = 0;
  let dy = 0;

  if (screenX < padding) dx = padding - screenX;
  if (screenY < padding) dy = padding - screenY;
  if (screenX + w > viewportW - padding) dx = viewportW - padding - (screenX + w);
  if (screenY + h > viewportH - padding) dy = viewportH - padding - (screenY + h);

  if (dx !== 0 || dy !== 0) {
    offset.x += dx;
    offset.y += dy;
    render();
  }
}

// --- Event Listeners ---

canvas.addEventListener("mousedown", async (e) => {
  dragStart = { x: e.clientX, y: e.clientY };
  lastOffset = { ...offset };
  isDragging = false;

  const node = getNodeAt(e.clientX, e.clientY);
  if (node) {
    if (mindMap && node.id !== mindMap.selected_node_id) {
      await invoke("select_node", { nodeId: node.id });
      await loadMapState();
    }
  } else {
    isDragging = true;
  }
});

canvas.addEventListener("mousemove", (e) => {
  if (isDragging) {
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    offset.x = lastOffset.x + dx;
    offset.y = lastOffset.y + dy;
    render();
  }
});

canvas.addEventListener("mouseup", () => {
  isDragging = false;
});

// If mouse is released outside the canvas, ensure panning stops.
window.addEventListener("mouseup", () => {
  isDragging = false;
});

canvas.addEventListener("mouseleave", () => {
  isDragging = false;
});

canvas.addEventListener("dblclick", async (e) => {
  const node = getNodeAt(e.clientX, e.clientY);
  if (node) {
    // startEdit needs visual position adjustment?
    const w = getNodeWidth(node);
    const h = NODE_HEIGHT;
    const canvasX = node.x + offset.x;
    const canvasY = node.y + offset.y;

    // Editor is fixed pos? No, absolute.
    // It's in body. So it needs left: canvasX + sidebarWidth

    startEdit(canvasX + sidebarWidth, canvasY, w, h, node.content);
  }
});

// Keyboard
window.addEventListener("keydown", async (e) => {
  if (isEditing) {
    if (e.key === "Enter") finishEdit();
    if (e.key === "Escape") cancelEdit();
    return;
  }

  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) e.preventDefault();

  try {
    let moved = false;
    if (e.key === "ArrowRight") { await invoke("navigate", { direction: "Right" }); moved = true; }
    if (e.key === "ArrowLeft") { await invoke("navigate", { direction: "Left" }); moved = true; }
    if (e.key === "ArrowDown") { await invoke("navigate", { direction: "Down" }); moved = true; }
    if (e.key === "ArrowUp") { await invoke("navigate", { direction: "Up" }); moved = true; }

    if (moved) {
      await loadMapState();
      if (mindMap) ensureVisible(mindMap.selected_node_id);
      return;
    }

    if (e.key === "Enter" || e.key === "Insert") {
      if (!mindMap) return;
      // Mark dirty *before* or *after*? Invoke changes backend.
      // We can assume success means dirty.

      let newId: string;
      let success = false;

      if (e.key === "Insert") {
        newId = await invoke("add_child", { parentId: mindMap.selected_node_id, content: "New Node" });
        success = true;
      } else {
        if (mindMap.selected_node_id === mindMap.root_id) {
          newId = await invoke("add_child", { parentId: mindMap.selected_node_id, content: "New Node" });
        } else {
          newId = await invoke("add_sibling", { nodeId: mindMap.selected_node_id, content: "New Node" });
        }
        success = true;
      }

      if (success) {
        await markDirty();
        await invoke("select_node", { nodeId: newId });
        await loadMapState();
        ensureVisible(newId);
        startEdit();
      }
      return;
    }

    if (e.key === "Delete") {
      if (mindMap && mindMap.selected_node_id !== mindMap.root_id) {
        await invoke("remove_node", { nodeId: mindMap.selected_node_id });
        await markDirty();
        await loadMapState();
      }
    } else if (e.key === "F2") {
      startEdit();
      return;
    } else if (e.ctrlKey && e.key === "s") {
      e.preventDefault();
      await saveMap(false);
    } else if (e.ctrlKey && e.key === "o") {
      e.preventDefault();
      await openMap();
    }

  } catch (err) {
    console.error("Command failed:", err);
  }
});

// Edit Handling
function startEdit(x?: number, y?: number, w?: number, h?: number, content?: string) {
  if (!mindMap) return;
  const node = mindMap.nodes[mindMap.selected_node_id];
  if (!node) return;

  isEditing = true;

  if (x === undefined) {
    // Calculated if triggered via key
    const nodeW = getNodeWidth(node);
    const nodeH = NODE_HEIGHT;
    x = node.x + offset.x + sidebarWidth;
    y = node.y + offset.y;
    w = nodeW;
    h = nodeH;
  }

  editor.value = content || node.content;
  editor.style.display = "block";
  editor.style.left = `${x}px`;
  editor.style.top = `${y}px`;
  editor.style.width = `${w}px`;
  editor.style.height = `${h}px`;
  editor.focus();
  editor.select();
}

async function finishEdit() {
  if (!mindMap || !isEditing) return;
  const content = editor.value;
  const id = mindMap.selected_node_id;

  try {
    await invoke("change_node", { nodeId: id, content });
    await markDirty();
    editor.style.display = "none";
    isEditing = false;
    await loadMapState();
  } catch (e) {
    console.error(e);
  }
}

function cancelEdit() {
  editor.style.display = "none";
  isEditing = false;
  editor.value = "";
  canvas.focus();
}

editor.addEventListener("blur", () => {
  if (isEditing) finishEdit();
});

// Init
async function initialize() {
  await ensureFontsLoaded();
  resize();
  await updateTitle();
  await loadMapState(true);

  // Get initial file path from backend (in case of restart with state?? probably empty)
  try {
    currentFilePath = await invoke<string | null>("get_file_path");
    await updateTitle();
  } catch {
    // Non-fatal: title will remain based on current client state.
  }
}

void initialize();
