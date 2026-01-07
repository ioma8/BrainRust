import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { invoke } from "@tauri-apps/api/core";
import { save, open, ask, confirm } from "@tauri-apps/plugin-dialog";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { MindMap, Node } from "./types";

const NODE_HEIGHT = 30;
const H_GAP = 50;
const V_GAP = 20;
const MIN_NODE_WIDTH = 100;
const NODE_FONT = '14px "Inter", sans-serif';
const NODE_FONT_LOAD = '14px "Inter"';
const THEME_STORAGE_KEY = "brainrust-theme";

type Theme = "light" | "dark";

type ThemeColors = {
  canvasBg: string;
  edge: string;
  node: string;
  nodeSelected: string;
  nodeBorder: string;
  nodeBorderSelected: string;
  nodeSelectedGlow: string;
  text: string;
  textSelected: string;
};

type TabState = {
  id: string;
  title: string;
  filePath: string | null;
  isDirty: boolean;
  map: MindMap | null;
  offset: { x: number; y: number };
};

const appWindow = getCurrentWindow();

const iconMap: Record<string, string> = {
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
  "trash": "🗑️"
};

const iconKeys = Object.keys(iconMap);

const defaultThemeColors: ThemeColors = {
  canvasBg: "#f5f6f8",
  edge: "#b1b7c0",
  node: "#ffffff",
  nodeSelected: "#3f6fe5",
  nodeBorder: "#d7dce3",
  nodeBorderSelected: "#2f56b8",
  nodeSelectedGlow: "rgba(63, 111, 229, 0.32)",
  text: "#1f2328",
  textSelected: "#ffffff"
};

function fileNameFromPath(path: string) {
  return path.split(/[\\/]/).pop() || path;
}

export function App() {
  const [tabs, setTabs] = useState<TabState[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editorStyle, setEditorStyle] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "dark" || stored === "light" ? stored : "light";
  });

  const tabsRef = useRef<TabState[]>([]);
  const activeTabIdRef = useRef<string | null>(null);
  const mindMapRef = useRef<MindMap | null>(null);
  const offsetRef = useRef({ x: 0, y: 0 });
  const viewportRef = useRef({ width: 0, height: 0 });
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const editorRef = useRef<HTMLInputElement | null>(null);
  const dragStateRef = useRef({
    isDragging: false,
    dragStart: { x: 0, y: 0 },
    lastOffset: { x: 0, y: 0 }
  });
  const untitledCounterRef = useRef(1);
  const themeColorsRef = useRef<ThemeColors>(defaultThemeColors);
  const isEditingRef = useRef(false);

  useEffect(() => {
    tabsRef.current = tabs;
  }, [tabs]);

  useEffect(() => {
    activeTabIdRef.current = activeTabId;
  }, [activeTabId]);

  useEffect(() => {
    isEditingRef.current = isEditing;
  }, [isEditing]);

  const iconButtons = useMemo(() => iconKeys.filter((key) => key !== "trash"), []);

  function getActiveTab(): TabState | null {
    const currentId = activeTabIdRef.current;
    if (!currentId) return null;
    return tabsRef.current.find((tab) => tab.id === currentId) || null;
  }

  function getCssVar(name: string, fallback: string) {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || fallback;
  }

  function updateThemeColors() {
    themeColorsRef.current = {
      canvasBg: getCssVar("--canvas-bg", defaultThemeColors.canvasBg),
      edge: getCssVar("--edge-color", defaultThemeColors.edge),
      node: getCssVar("--node-bg", defaultThemeColors.node),
      nodeSelected: getCssVar("--node-selected-bg", defaultThemeColors.nodeSelected),
      nodeBorder: getCssVar("--node-border", defaultThemeColors.nodeBorder),
      nodeBorderSelected: getCssVar("--node-selected-border", defaultThemeColors.nodeBorderSelected),
      nodeSelectedGlow: getCssVar("--node-selected-glow", defaultThemeColors.nodeSelectedGlow),
      text: getCssVar("--text-color", defaultThemeColors.text),
      textSelected: getCssVar("--text-color-selected", defaultThemeColors.textSelected)
    };
  }

  function applyTheme(nextTheme: Theme) {
    setTheme(nextTheme);
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

  async function updateTitle(tabOverride?: TabState | null) {
    const tab = tabOverride ?? getActiveTab();
    let title = tab?.title || "BrainRust";
    if (tab?.isDirty) title += "*";
    try {
      await appWindow.setTitle(title);
    } catch (e) {
      console.error("Failed to set title", e);
    }
  }

  function renderCanvas() {
    const map = mindMapRef.current;
    const ctx = ctxRef.current;
    if (!map || !ctx) return;

    const { width, height } = viewportRef.current;
    if (width <= 0 || height <= 0) return;

    const colors = themeColorsRef.current;
    ctx.fillStyle = colors.canvasBg;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = colors.edge;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const clamp = (value: number, min: number, max: number) =>
      Math.min(max, Math.max(min, value));

    Object.values(map.nodes).forEach((node) => {
      if (node.parent && map.nodes[node.parent]) {
        const parent = map.nodes[node.parent];

        const pW = getNodeWidth(parent);
        const pH = NODE_HEIGHT;
        const cH = NODE_HEIGHT;

        const pCx = parent.x + offsetRef.current.x + pW;
        const pCy = parent.y + offsetRef.current.y + pH / 2;

        const cCx = node.x + offsetRef.current.x;
        const cCy = node.y + offsetRef.current.y + cH / 2;

        const dx = cCx - pCx;
        const trunk = clamp(Math.abs(dx) * 0.45, 30, 120);
        const cp1x = pCx + trunk;
        const cp2x = pCx + trunk;

        ctx.beginPath();
        ctx.moveTo(pCx, pCy);
        ctx.bezierCurveTo(cp1x, pCy, cp2x, cCy, cCx, cCy);
        ctx.stroke();
      }
    });

    Object.values(map.nodes).forEach((node) => {
      const isSelected = node.id === map.selected_node_id;
      drawNode(node, isSelected);
    });
  }

  function resizeCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    viewportRef.current = { width: rect.width, height: rect.height };
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctxRef.current = ctx;
    }
    renderCanvas();
  }

  function getViewportSize() {
    const { width, height } = viewportRef.current;
    if (width > 0 && height > 0) return { width, height };
    return { width: window.innerWidth, height: window.innerHeight };
  }

  function defaultOffset() {
    const viewport = getViewportSize();
    return { x: viewport.width / 2, y: viewport.height / 2 };
  }

  function syncActiveTabState() {
    const activeId = activeTabIdRef.current;
    if (!activeId) return;
    const map = mindMapRef.current;
    const offset = offsetRef.current;
    setTabs((prev) =>
      prev.map((tab) =>
        tab.id === activeId ? { ...tab, map, offset: { ...offset } } : tab
      )
    );
  }

  async function markDirty() {
    const tab = getActiveTab();
    if (!tab || tab.isDirty) return;
    setTabs((prev) =>
      prev.map((item) =>
        item.id === tab.id ? { ...item, isDirty: true } : item
      )
    );
    await updateTitle();
  }

  function updateTabTitle(tab: TabState) {
    if (tab.filePath) {
      tab.title = fileNameFromPath(tab.filePath);
    }
  }

  function getNodeWidth(node: Node): number {
    const ctx = ctxRef.current;
    if (!ctx) return MIN_NODE_WIDTH;
    ctx.font = NODE_FONT;
    const textW = ctx.measureText(node.content).width;
    const iconsW = node.icons ? node.icons.length * 20 : 0;
    return Math.max(textW + iconsW + 20, MIN_NODE_WIDTH);
  }

  function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    let radius = r;
    if (w < 2 * radius) radius = w / 2;
    if (h < 2 * radius) radius = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  function drawNode(node: Node, isSelected: boolean) {
    const ctx = ctxRef.current;
    const map = mindMapRef.current;
    if (!ctx || !map) return;
    const w = getNodeWidth(node);
    const h = NODE_HEIGHT;
    const x = node.x + offsetRef.current.x;
    const y = node.y + offsetRef.current.y;
    const colors = themeColorsRef.current;

    ctx.fillStyle = isSelected ? colors.nodeSelected : colors.node;
    if (isSelected) {
      ctx.shadowColor = colors.nodeSelectedGlow;
      ctx.shadowBlur = 10;
    } else {
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
    }

    roundRect(ctx, x, y, w, h, 5);
    ctx.fill();

    ctx.strokeStyle = isSelected ? colors.nodeBorderSelected : colors.nodeBorder;
    ctx.lineWidth = isSelected ? 2 : 1;
    ctx.stroke();

    ctx.fillStyle = isSelected ? colors.textSelected : colors.text;
    ctx.font = NODE_FONT;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";

    let currentX = x + 10;
    if (node.icons) {
      node.icons.forEach((iconName) => {
        const emoji = iconMap[iconName] || "❓";
        ctx.fillText(emoji, currentX, y + h / 2 + 1);
        currentX += 20;
      });
    }

    ctx.fillText(node.content, currentX, y + h / 2);
  }

  function computeLayout() {
    const map = mindMapRef.current;
    if (!map) return;
    const rootId = map.root_id;
    const prevRoot = map.nodes[rootId];
    const prevX = prevRoot?.x ?? 0;
    const prevY = prevRoot?.y ?? 0;

    layoutNode(rootId, 0, 0);

    const nextRoot = map.nodes[rootId];
    if (!nextRoot) return;
    const dx = prevX - nextRoot.x;
    const dy = prevY - nextRoot.y;
    if (dx !== 0 || dy !== 0) {
      Object.values(map.nodes).forEach((node) => {
        node.x += dx;
        node.y += dy;
      });
    }
  }

  function layoutNode(nodeId: string, x: number, startY: number): number {
    const map = mindMapRef.current;
    if (!map) return NODE_HEIGHT + V_GAP;
    const node = map.nodes[nodeId];
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
      if (!map.nodes[childId]) continue;
      const h = layoutNode(childId, childX, currentY);
      currentY += h;
    }

    const totalH = Math.max(currentY - startY, rowH);
    node.x = x;
    node.y = startY + (totalH - rowH) / 2;
    return totalH;
  }

  function fitView() {
    const map = mindMapRef.current;
    if (!map) return;
    const nodes = Object.values(map.nodes);
    if (nodes.length === 0) return;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    nodes.forEach((node) => {
      const w = getNodeWidth(node);
      const h = NODE_HEIGHT;
      if (node.x < minX) minX = node.x;
      if (node.y < minY) minY = node.y;
      if (node.x + w > maxX) maxX = node.x + w;
      if (node.y + h > maxY) maxY = node.y + h;
    });

    const bboxW = maxX - minX;
    const bboxH = maxY - minY;

    const cx = minX + bboxW / 2;
    const cy = minY + bboxH / 2;
    const viewport = getViewportSize();

    offsetRef.current = {
      x: viewport.width / 2 - cx,
      y: viewport.height / 2 - cy
    };

    renderCanvas();
  }

  function screenToWorld(x: number, y: number) {
    return { x: x - offsetRef.current.x, y: y - offsetRef.current.y };
  }

  function getCanvasPoint(clientX: number, clientY: number) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top, rect };
  }

  function getNodeAt(clientX: number, clientY: number): Node | null {
    const map = mindMapRef.current;
    if (!map) return null;
    const point = getCanvasPoint(clientX, clientY);
    if (!point) return null;
    const p = screenToWorld(point.x, point.y);
    for (const node of Object.values(map.nodes)) {
      const w = getNodeWidth(node);
      const h = NODE_HEIGHT;
      if (p.x >= node.x && p.x <= node.x + w && p.y >= node.y && p.y <= node.y + h) {
        return node;
      }
    }
    return null;
  }

  function ensureVisible(nodeId: string) {
    const map = mindMapRef.current;
    if (!map) return;
    const node = map.nodes[nodeId];
    if (!node) return;

    const w = getNodeWidth(node);
    const h = NODE_HEIGHT;

    const screenX = node.x + offsetRef.current.x;
    const screenY = node.y + offsetRef.current.y;
    const padding = 50;
    const viewport = getViewportSize();

    let dx = 0;
    let dy = 0;

    if (screenX < padding) dx = padding - screenX;
    if (screenY < padding) dy = padding - screenY;
    if (screenX + w > viewport.width - padding) dx = viewport.width - padding - (screenX + w);
    if (screenY + h > viewport.height - padding) dy = viewport.height - padding - (screenY + h);

    if (dx !== 0 || dy !== 0) {
      offsetRef.current = { x: offsetRef.current.x + dx, y: offsetRef.current.y + dy };
      renderCanvas();
    }
  }

  async function loadMapState(tabId: string, fit = false) {
    try {
      const map = await invoke<MindMap>("get_map", { tabId });
      mindMapRef.current = map;
      computeLayout();
      if (fit) fitView();
      const offset = { ...offsetRef.current };
      setTabs((prev) =>
        prev.map((tab) => (tab.id === tabId ? { ...tab, map, offset } : tab))
      );
      renderCanvas();
    } catch (e) {
      console.error("Failed to load map:", e);
    }
  }

  async function createNewTab() {
    syncActiveTabState();
    const tabId = crypto.randomUUID();
    const tab: TabState = {
      id: tabId,
      title: `Untitled ${untitledCounterRef.current++}`,
      filePath: null,
      isDirty: false,
      map: null,
      offset: defaultOffset()
    };
    setTabs((prev) => [...prev, tab]);
    setActiveTabId(tabId);
    activeTabIdRef.current = tabId;
    offsetRef.current = { ...tab.offset };

    try {
      const map = await invoke<MindMap>("new_map", { tabId });
      mindMapRef.current = map;
      computeLayout();
      fitView();
      const offset = { ...offsetRef.current };
      const updatedTab = { ...tab, map, offset };
      setTabs((prev) =>
        prev.map((item) => (item.id === tabId ? updatedTab : item))
      );
      await updateTitle(updatedTab);
    } catch (e) {
      console.error(e);
    }
  }

  async function closeTab(tabId: string) {
    const currentTabs = tabsRef.current;
    const tabIndex = currentTabs.findIndex((tab) => tab.id === tabId);
    if (tabIndex === -1) return;
    const tab = currentTabs[tabIndex];
    if (tab.isDirty) {
      const confirmed = await confirm("You have unsaved changes. Close this tab?", {
        kind: "warning",
        title: "Unsaved Changes"
      });
      if (!confirmed) return;
    }

    if (tabId === activeTabIdRef.current) {
      syncActiveTabState();
    }

    try {
      await invoke("close_tab", { tabId });
    } catch (e) {
      console.error(e);
    }

    const nextTabs = currentTabs.filter((item) => item.id !== tabId);
    setTabs(nextTabs);

    if (nextTabs.length === 0) {
      setActiveTabId(null);
      activeTabIdRef.current = null;
      mindMapRef.current = null;
      await createNewTab();
      return;
    }

    if (tabId === activeTabIdRef.current) {
      const nextTab = nextTabs[tabIndex] || nextTabs[tabIndex - 1];
      if (nextTab) {
        setActiveTabId(nextTab.id);
        activeTabIdRef.current = nextTab.id;
        offsetRef.current = { ...nextTab.offset };
        mindMapRef.current = nextTab.map;
        if (nextTab.map) {
          computeLayout();
          renderCanvas();
        } else {
          await loadMapState(nextTab.id, true);
        }
        await updateTitle(nextTab);
      }
    } else {
      await updateTitle();
    }
  }

  function switchToTab(tabId: string) {
    if (tabId === activeTabIdRef.current) return;
    syncActiveTabState();
    const tab = tabsRef.current.find((item) => item.id === tabId);
    if (!tab) return;
    setActiveTabId(tabId);
    activeTabIdRef.current = tabId;
    offsetRef.current = { ...tab.offset };
    mindMapRef.current = tab.map;
    if (tab.map) {
      computeLayout();
      renderCanvas();
    } else {
      void loadMapState(tabId, true);
    }
    void updateTitle(tab);
  }

  function cycleTab(step: number) {
    const currentTabs = tabsRef.current;
    const currentId = activeTabIdRef.current;
    if (currentTabs.length < 2 || !currentId) return;
    const currentIndex = currentTabs.findIndex((tab) => tab.id === currentId);
    if (currentIndex === -1) return;
    const nextIndex = (currentIndex + step + currentTabs.length) % currentTabs.length;
    switchToTab(currentTabs[nextIndex].id);
  }

  async function createNewMap() {
    await createNewTab();
  }

  async function openMapPath(path: string) {
    const existingTab = tabsRef.current.find((tab) => tab.filePath === path);
    if (existingTab) {
      switchToTab(existingTab.id);
      return;
    }

    syncActiveTabState();
    const tabId = crypto.randomUUID();
    const tab: TabState = {
      id: tabId,
      title: fileNameFromPath(path),
      filePath: path,
      isDirty: false,
      map: null,
      offset: defaultOffset()
    };
    setTabs((prev) => [...prev, tab]);
    setActiveTabId(tabId);
    activeTabIdRef.current = tabId;
    offsetRef.current = { ...tab.offset };

    try {
      await invoke("new_map", { tabId });
      await invoke("load_map", { tabId, path });
      await loadMapState(tabId, true);
      const updatedTab = { ...tab, filePath: path, isDirty: false };
      updateTabTitle(updatedTab);
      setTabs((prev) =>
        prev.map((item) => (item.id === tabId ? updatedTab : item))
      );
      await updateTitle(updatedTab);
    } catch (e) {
      console.error(e);
    }
  }

  async function openMap() {
    try {
      const path = await open({
        multiple: false,
        directory: false,
        filters: [
          { name: "MindMap Files", extensions: ["mm", "xmind", "opml", "mmap", "mindnode", "smmx"] },
          { name: "FreeMind", extensions: ["mm"] },
          { name: "XMind", extensions: ["xmind"] },
          { name: "OPML", extensions: ["opml"] },
          { name: "MindManager", extensions: ["mmap"] },
          { name: "MindNode", extensions: ["mindnode"] },
          { name: "SimpleMind", extensions: ["smmx"] }
        ]
      });

      if (typeof path === "string") {
        await openMapPath(path);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function saveMap(saveAs = false) {
    const tab = getActiveTab();
    if (!tab) return;
    try {
      let path = tab.filePath;

      if (saveAs || !path) {
        path = await save({
          filters: [
            { name: "FreeMind", extensions: ["mm"] },
            { name: "XMind", extensions: ["xmind"] },
            { name: "OPML", extensions: ["opml"] },
            { name: "MindManager", extensions: ["mmap"] },
            { name: "MindNode", extensions: ["mindnode"] },
            { name: "SimpleMind", extensions: ["smmx"] }
          ],
          defaultPath: tab.filePath || undefined
        });
      }

      if (path) {
        const savedPath = await invoke<string>("save_map", { tabId: tab.id, path });
        const updatedTab = { ...tab, filePath: savedPath, isDirty: false };
        updateTabTitle(updatedTab);
        setTabs((prev) =>
          prev.map((item) => (item.id === tab.id ? updatedTab : item))
        );
        await updateTitle(updatedTab);
      }
    } catch (e) {
      console.error("Save failed:", e);
    }
  }

  async function handleIconClick(key: string) {
    const tab = getActiveTab();
    const map = mindMapRef.current;
    if (!tab || !map) return;
    const id = map.selected_node_id;
    try {
      if (key === "trash") {
        await invoke("remove_last_icon", { tabId: tab.id, nodeId: id });
      } else {
        await invoke("add_icon", { tabId: tab.id, nodeId: id, icon: key });
      }
      await markDirty();
      await loadMapState(tab.id);
    } catch (e) {
      console.error(e);
    }
  }

  function startEdit(x?: number, y?: number, w?: number, h?: number, content?: string) {
    const map = mindMapRef.current;
    if (!map) return;
    const node = map.nodes[map.selected_node_id];
    if (!node) return;

    const editor = editorRef.current;
    if (!editor) return;

    let left = x;
    let top = y;
    let width = w;
    let height = h;

    if (left === undefined || top === undefined) {
      const nodeW = getNodeWidth(node);
      const nodeH = NODE_HEIGHT;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      left = rect.left + node.x + offsetRef.current.x;
      top = rect.top + node.y + offsetRef.current.y;
      width = nodeW;
      height = nodeH;
    }

    editor.value = content || node.content;
    setEditorStyle({
      left: left ?? 0,
      top: top ?? 0,
      width: width ?? 0,
      height: height ?? 0
    });
    setIsEditing(true);
    requestAnimationFrame(() => {
      editor.focus();
      editor.select();
    });
  }

  async function finishEdit() {
    const map = mindMapRef.current;
    if (!map || !isEditingRef.current) return;
    const tab = getActiveTab();
    const editor = editorRef.current;
    if (!tab || !editor) return;
    const content = editor.value;
    const id = map.selected_node_id;
    try {
      await invoke("change_node", { tabId: tab.id, nodeId: id, content });
      await markDirty();
      setIsEditing(false);
      setEditorStyle(null);
      await loadMapState(tab.id);
    } catch (e) {
      console.error(e);
    }
  }

  function cancelEdit() {
    setIsEditing(false);
    setEditorStyle(null);
    const editor = editorRef.current;
    if (editor) editor.value = "";
    canvasRef.current?.focus();
  }

  function handleMouseDown(event: MouseEvent) {
    const dragState = dragStateRef.current;
    dragState.dragStart = { x: event.clientX, y: event.clientY };
    dragState.lastOffset = { ...offsetRef.current };
    dragState.isDragging = false;

    const node = getNodeAt(event.clientX, event.clientY);
    if (node) {
      const tab = getActiveTab();
      const map = mindMapRef.current;
      if (tab && map && node.id !== map.selected_node_id) {
        void (async () => {
          await invoke("select_node", { tabId: tab.id, nodeId: node.id });
          await loadMapState(tab.id);
        })();
      }
    } else {
      dragState.isDragging = true;
    }
  }

  function handleMouseMove(event: MouseEvent) {
    const dragState = dragStateRef.current;
    if (dragState.isDragging) {
      const dx = event.clientX - dragState.dragStart.x;
      const dy = event.clientY - dragState.dragStart.y;
      offsetRef.current = {
        x: dragState.lastOffset.x + dx,
        y: dragState.lastOffset.y + dy
      };
      renderCanvas();
    }
  }

  function handleMouseUp() {
    dragStateRef.current.isDragging = false;
  }

  function handleDoubleClick(event: MouseEvent) {
    const node = getNodeAt(event.clientX, event.clientY);
    if (!node) return;
    const w = getNodeWidth(node);
    const h = NODE_HEIGHT;
    const point = getCanvasPoint(event.clientX, event.clientY);
    if (!point) return;
    const canvasX = node.x + offsetRef.current.x;
    const canvasY = node.y + offsetRef.current.y;
    startEdit(point.rect.left + canvasX, point.rect.top + canvasY, w, h, node.content);
  }

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    updateThemeColors();
    renderCanvas();
  }, [theme]);

  useEffect(() => {
    resizeCanvas();
    void ensureFontsLoaded().then(() => {
      updateThemeColors();
      renderCanvas();
    });

    const observer = new ResizeObserver(() => {
      resizeCanvas();
    });
    if (canvasRef.current) observer.observe(canvasRef.current);

    const handleWindowResize = () => resizeCanvas();
    window.addEventListener("resize", handleWindowResize);

    const handleWindowMouseUp = () => {
      dragStateRef.current.isDragging = false;
    };
    window.addEventListener("mouseup", handleWindowMouseUp);

    void createNewTab();

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", handleWindowResize);
      window.removeEventListener("mouseup", handleWindowMouseUp);
    };
  }, []);

  useEffect(() => {
    let unlistenMenu: (() => void) | undefined;
    let unlistenRecent: (() => void) | undefined;

    listen("menu-event", async (event) => {
      const action = event.payload as string;
      switch (action) {
        case "new":
          await createNewMap();
          break;
        case "open":
          await openMap();
          break;
        case "save":
          await saveMap(false);
          break;
        case "save_as":
          await saveMap(true);
          break;
        case "exit":
          await appWindow.close();
          break;
        case "add_child": {
          const tab = getActiveTab();
          const map = mindMapRef.current;
          if (tab && map) {
            const newId = await invoke<string>("add_child", {
              tabId: tab.id,
              parentId: map.selected_node_id,
              content: "New Node"
            });
            await markDirty();
            await invoke("select_node", { tabId: tab.id, nodeId: newId });
            await loadMapState(tab.id);
            ensureVisible(newId);
            startEdit();
          }
          break;
        }
        case "add_sibling": {
          const tab = getActiveTab();
          const map = mindMapRef.current;
          if (tab && map && map.selected_node_id !== map.root_id) {
            const newId = await invoke<string>("add_sibling", {
              tabId: tab.id,
              nodeId: map.selected_node_id,
              content: "New Node"
            });
            await markDirty();
            await invoke("select_node", { tabId: tab.id, nodeId: newId });
            await loadMapState(tab.id);
            ensureVisible(newId);
            startEdit();
          }
          break;
        }
        case "delete_node": {
          const tab = getActiveTab();
          const map = mindMapRef.current;
          if (tab && map && map.selected_node_id !== map.root_id) {
            await invoke("remove_node", { tabId: tab.id, nodeId: map.selected_node_id });
            await markDirty();
            await loadMapState(tab.id);
          }
          break;
        }
        case "rename_node":
          startEdit();
          break;
        case "about":
          await ask(
            "BrainRust v0.1.0\n\nA FreeMind-compatible mind mapping tool built with Tauri + Rust + Canvas.",
            { title: "About BrainRust", kind: "info" }
          );
          break;
      }
    }).then((fn) => {
      unlistenMenu = fn;
    });

    listen("menu-open-recent", async (event) => {
      const path = event.payload as string;
      if (!path) return;
      await openMapPath(path);
    }).then((fn) => {
      unlistenRecent = fn;
    });

    return () => {
      if (unlistenMenu) unlistenMenu();
      if (unlistenRecent) unlistenRecent();
    };
  }, []);

  useEffect(() => {
    let unlistenClose: (() => void) | undefined;
    appWindow.onCloseRequested(async (event) => {
      const hasDirtyTabs = tabsRef.current.some((tab) => tab.isDirty);
      if (hasDirtyTabs) {
        event.preventDefault();
        const confirmed = await confirm(
          "You have unsaved changes. Are you sure you want to exit?",
          { kind: "warning", title: "Unsaved Changes" }
        );
        if (confirmed) {
          await appWindow.destroy();
        }
      }
    }).then((fn) => {
      unlistenClose = fn;
    });

    return () => {
      if (unlistenClose) unlistenClose();
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = async (event: KeyboardEvent) => {
      const isAccel = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();

      if (isAccel && key === "t") {
        event.preventDefault();
        await createNewTab();
        return;
      }
      if (isAccel && key === "w") {
        event.preventDefault();
        const currentId = activeTabIdRef.current;
        if (currentId) await closeTab(currentId);
        return;
      }
      if (isAccel && event.key === "Tab") {
        event.preventDefault();
        cycleTab(event.shiftKey ? -1 : 1);
        return;
      }

      if (isEditingRef.current) {
        if (event.key === "Enter") await finishEdit();
        if (event.key === "Escape") cancelEdit();
        return;
      }

      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
        event.preventDefault();
      }

      const tab = getActiveTab();
      if (!tab) return;
      let moved = false;
      if (event.key === "ArrowRight") {
        await invoke("navigate", { tabId: tab.id, direction: "Right" });
        moved = true;
      }
      if (event.key === "ArrowLeft") {
        await invoke("navigate", { tabId: tab.id, direction: "Left" });
        moved = true;
      }
      if (event.key === "ArrowDown") {
        await invoke("navigate", { tabId: tab.id, direction: "Down" });
        moved = true;
      }
      if (event.key === "ArrowUp") {
        await invoke("navigate", { tabId: tab.id, direction: "Up" });
        moved = true;
      }

      if (moved) {
        await loadMapState(tab.id);
        const map = mindMapRef.current;
        if (map) ensureVisible(map.selected_node_id);
        return;
      }

      if (event.key === "Enter" || event.key === "Insert") {
        const map = mindMapRef.current;
        if (!map) return;
        let newId = "";
        if (event.key === "Insert") {
          newId = await invoke("add_child", {
            tabId: tab.id,
            parentId: map.selected_node_id,
            content: "New Node"
          });
        } else {
          if (map.selected_node_id === map.root_id) {
            newId = await invoke("add_child", {
              tabId: tab.id,
              parentId: map.selected_node_id,
              content: "New Node"
            });
          } else {
            newId = await invoke("add_sibling", {
              tabId: tab.id,
              nodeId: map.selected_node_id,
              content: "New Node"
            });
          }
        }
        if (newId) {
          await markDirty();
          await invoke("select_node", { tabId: tab.id, nodeId: newId });
          await loadMapState(tab.id);
          ensureVisible(newId);
          startEdit();
        }
        return;
      }

      if (event.key === "Delete") {
        const map = mindMapRef.current;
        if (map && map.selected_node_id !== map.root_id) {
          await invoke("remove_node", { tabId: tab.id, nodeId: map.selected_node_id });
          await markDirty();
          await loadMapState(tab.id);
        }
      } else if (event.key === "F2") {
        startEdit();
        return;
      } else if (isAccel && key === "s") {
        event.preventDefault();
        await saveMap(false);
      } else if (isAccel && key === "o") {
        event.preventDefault();
        await openMap();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div className="flex h-full w-full bg-[var(--app-bg)] text-[var(--text-color)]">
      <div
        id="sidebar"
        className="z-20 flex h-full w-11 flex-col border-r border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] shadow-[2px_0_12px_rgba(15,23,42,0.08)]"
      >
        <div
          id="toolbar-fixed"
          className="flex flex-col items-center gap-2 border-b border-[var(--toolbar-border)] bg-[var(--sidebar-bg)] py-3"
        >
          <button
            type="button"
            className="theme-toggle"
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            aria-pressed={theme === "dark"}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            onClick={() => applyTheme(theme === "dark" ? "light" : "dark")}
          />
          <button
            type="button"
            className="icon-btn rounded-md px-1.5 py-1 text-base transition hover:bg-[var(--tab-button-hover)]"
            title="trash"
            onClick={() => void handleIconClick("trash")}
          >
            {iconMap["trash"]}
          </button>
        </div>
        <div
          id="toolbar-scrollable"
          className="flex flex-1 flex-col items-center overflow-y-auto overflow-x-hidden py-1.5"
        >
          {iconButtons.map((key) => (
            <button
              type="button"
              key={key}
              className="icon-btn rounded-md px-1.5 py-1 text-base transition hover:bg-[var(--tab-button-hover)]"
              title={key}
              onClick={() => void handleIconClick(key)}
            >
              {iconMap[key]}
            </button>
          ))}
        </div>
      </div>

      <div className="relative flex h-full flex-1 flex-col">
        <div
          id="tab-bar"
          className="flex h-[var(--tabbar-height)] items-center gap-2 border-b border-[var(--tab-border)] bg-[var(--tabbar-bg)] px-2 shadow-[0_1px_0_rgba(15,23,42,0.06)]"
        >
          <div id="tabs" className="flex flex-1 items-center gap-1.5 overflow-x-auto py-1">
            {tabs.map((tab) => {
              const isActive = tab.id === activeTabId;
              return (
                <div
                  key={tab.id}
                  role="tab"
                  aria-selected={isActive}
                  title={tab.filePath || tab.title}
                  onClick={() => switchToTab(tab.id)}
                  className={[
                    "inline-flex max-w-[220px] cursor-pointer items-center gap-2 overflow-hidden rounded-t-lg rounded-b-md border px-3 py-1.5 text-[13px] transition",
                    "border-[var(--tab-border)] bg-[var(--tab-bg)] text-[var(--tab-text)] hover:border-[var(--tab-active-border)] hover:bg-[var(--tab-active-bg)]",
                    isActive
                      ? "border-[var(--tab-active-border)] bg-[var(--tab-active-bg)] text-[var(--tab-text-active)] shadow-[0_6px_16px_rgba(15,23,42,0.12)]"
                      : ""
                  ].join(" ")}
                >
                  <span className="truncate">
                    {tab.title}
                    {tab.isDirty ? "*" : ""}
                  </span>
                  <button
                    type="button"
                    className="flex h-4 w-4 items-center justify-center rounded-full text-xs opacity-60 transition hover:bg-[var(--tab-close-hover)] hover:opacity-100"
                    onClick={(event) => {
                      event.stopPropagation();
                      void closeTab(tab.id);
                    }}
                  >
                    ×
                  </button>
                </div>
              );
            })}
            <button
              id="new-tab-btn"
              type="button"
              aria-label="New tab"
              className="flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-full border border-[var(--tab-border)] bg-transparent text-[var(--tab-text)] transition hover:border-[var(--tab-active-border)] hover:bg-[var(--tab-button-hover)]"
              onClick={() => void createNewTab()}
            >
              +
            </button>
          </div>
        </div>

        <div className="relative flex flex-1">
          <canvas
            ref={canvasRef}
            className="h-full w-full bg-[var(--canvas-bg)]"
            tabIndex={0}
            onMouseDown={(event) => handleMouseDown(event)}
            onMouseMove={(event) => handleMouseMove(event)}
            onMouseUp={() => handleMouseUp()}
            onMouseLeave={() => handleMouseUp()}
            onDblClick={(event) => handleDoubleClick(event)}
          />
        </div>
      </div>

      <input
        ref={editorRef}
        type="text"
        id="node-editor"
        className={[
          "fixed z-30 rounded-[6px] border-2 bg-[var(--editor-bg)] px-2 py-1 text-sm text-[var(--text-color)] outline-none shadow-[0_12px_30px_rgba(15,23,42,0.16)]",
          "border-[var(--editor-border)]",
          isEditing ? "block" : "hidden"
        ].join(" ")}
        style={editorStyle ? {
          left: `${editorStyle.left}px`,
          top: `${editorStyle.top}px`,
          width: `${editorStyle.width}px`,
          height: `${editorStyle.height}px`
        } : undefined}
        onBlur={() => {
          if (isEditingRef.current) void finishEdit();
        }}
      />
    </div>
  );
}
