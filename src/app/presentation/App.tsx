import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import type { MindMap } from "../../types";
import { NODE_HEIGHT } from "../domain/values/layout";
import { iconKeys } from "./constants/icons";
import { openFilters, saveFilters } from "./constants/fileDialogs";
import { NODE_FONT_LOAD } from "./constants/typography";
import {
  defaultThemeColors,
  loadTheme,
  persistTheme,
  resolveThemeColors,
  type Theme,
  type ThemeColors
} from "./theme/theme";
import {
  getActiveTab as getActiveTabState,
  getTabById as getTabByIdState,
  updateTab as updateTabState,
  type AppState,
  type TabState
} from "../application/state/tabState";
import { CanvasView } from "./components/CanvasView";
import { NodeEditor, type EditorStyle } from "./components/NodeEditor";
import { Sidebar } from "./components/Sidebar";
import { TabBar } from "./components/TabBar";
import { useCanvasRenderer } from "./hooks/useCanvasRenderer";
import { dialog } from "../infrastructure/tauri/dialogApi";
import { events } from "../infrastructure/tauri/eventApi";
import * as mindmapApi from "../infrastructure/tauri/mindmapApi";
import { appWindow } from "../infrastructure/tauri/windowApi";
import { addNode as addNodeUsecase, changeNode as changeNodeUsecase, removeSelectedNode as removeSelectedNodeUsecase, updateIcon as updateIconUsecase } from "../application/usecases/nodes";
import { navigateSelection as navigateSelectionUsecase, selectNode as selectNodeUsecase } from "../application/usecases/selection";
import { openFromDialog as openFromDialogUsecase, saveMap as saveMapUsecase } from "../application/usecases/files";
import { closeTab as closeTabUsecase, createNewTab as createNewTabUsecase, openMapPath as openMapPathUsecase, switchToTab as switchToTabUsecase } from "../application/usecases/tabs";
import { confirmCloseApp } from "../application/usecases/appClose";
import type { UsecaseResult } from "../application/usecases/result";



export function App() {
  const [appState, setAppState] = useState<AppState>({
    tabs: [],
    activeTabId: null
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editorStyle, setEditorStyle] = useState<EditorStyle | null>(null);
  const [theme, setTheme] = useState<Theme>(() => loadTheme());

  const stateRef = useRef<AppState>({ tabs: [], activeTabId: null });
  const editorRef = useRef<HTMLInputElement | null>(null);
  const dragStateRef = useRef({
    isDragging: false,
    dragStart: { x: 0, y: 0 },
    lastOffset: { x: 0, y: 0 }
  });
  const untitledCounterRef = useRef(1);
  const themeColorsRef = useRef<ThemeColors>(defaultThemeColors);
  const isEditingRef = useRef(false);
  const {
    canvasRef,
    getLayoutConfig,
    getNodeWidth,
    getViewportSize,
    getCanvasPoint,
    getNodeAt,
    renderCanvas,
    resizeCanvas
  } = useCanvasRenderer(themeColorsRef);
  const deps = useMemo(() => ({
    id: { nextId: () => crypto.randomUUID() },
    layout: { getLayoutConfig, getViewport: getViewportSize },
    mindmap: mindmapApi,
    dialog,
    window: {
      setTitle: (title: string) => appWindow.setTitle(title),
      close: () => appWindow.close(),
      destroy: () => appWindow.destroy()
    }
  }), [getLayoutConfig, getViewportSize]);

  useEffect(() => {
    stateRef.current = appState;
  }, [appState]);

  useEffect(() => {
    const activeTab = appState.tabs.find((tab) => tab.id === appState.activeTabId);
    if (activeTab?.map) {
      renderCanvas(activeTab.map, activeTab.offset);
    }
  }, [appState, renderCanvas]);

  useEffect(() => {
    isEditingRef.current = isEditing;
  }, [isEditing]);

  const iconButtons = useMemo(() => iconKeys.filter((key) => key !== "trash"), []);

  function getActiveTab(): TabState | null {
    return getActiveTabState(stateRef.current);
  }

  function updateThemeColors() {
    themeColorsRef.current = resolveThemeColors();
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

  function renderActiveTab() {
    const tab = getActiveTab();
    if (!tab?.map) return;
    renderCanvas(tab.map, tab.offset);
  }

  function defaultOffset() {
    const viewport = getViewportSize();
    return { x: viewport.width / 2, y: viewport.height / 2 };
  }

  function updateAppState(updater: (state: AppState) => AppState) {
    setAppState((prev) => updater(prev));
  }

  function applyResult(result: UsecaseResult) {
    updateAppState(() => result.state);
    if (result.render) {
      renderCanvas(result.render.map, result.render.offset);
    }
  }

  async function createNewTab() {
    try {
      const title = `Untitled ${untitledCounterRef.current++}`;
      const result = await createNewTabUsecase(stateRef.current, deps, title);
      applyResult(result);
    } catch (e) {
      console.error(e);
    }
  }

  async function closeTab(tabId: string) {
    try {
      const willCloseLast = stateRef.current.tabs.length === 1;
      const fallbackTitle = willCloseLast
        ? `Untitled ${untitledCounterRef.current++}`
        : `Untitled ${untitledCounterRef.current}`;
      const result = await closeTabUsecase(stateRef.current, deps, tabId, fallbackTitle);
      applyResult(result);
    } catch (e) {
      console.error(e);
    }
  }

  async function switchToTab(tabId: string) {
    try {
      const result = await switchToTabUsecase(stateRef.current, deps, tabId, true);
      applyResult(result);
    } catch (e) {
      console.error(e);
    }
  }

  function cycleTab(step: number) {
    const currentTabs = stateRef.current.tabs;
    const currentId = stateRef.current.activeTabId;
    if (currentTabs.length < 2 || !currentId) return;
    const currentIndex = currentTabs.findIndex((tab) => tab.id === currentId);
    if (currentIndex === -1) return;
    const nextIndex = (currentIndex + step + currentTabs.length) % currentTabs.length;
    void switchToTab(currentTabs[nextIndex].id);
  }

  async function createNewMap() {
    await createNewTab();
  }

  async function openMapPath(path: string) {
    try {
      const result = await openMapPathUsecase(stateRef.current, deps, path);
      applyResult(result);
    } catch (e) {
      console.error(e);
    }
  }

  async function openMap() {
    try {
      const result = await openFromDialogUsecase(stateRef.current, deps, openFilters);
      applyResult(result);
    } catch (e) {
      console.error(e);
    }
  }

  async function saveMap(saveAs = false) {
    const tab = getActiveTab();
    if (!tab) return;
    try {
      const result = await saveMapUsecase(stateRef.current, deps, tab.id, saveAs, saveFilters);
      applyResult(result);
    } catch (e) {
      console.error("Save failed:", e);
    }
  }

  async function handleIconClick(key: string) {
    const tab = getActiveTab();
    if (!tab?.map) return;
    try {
      const result = await updateIconUsecase(stateRef.current, deps, tab.id, key);
      applyResult(result);
    } catch (e) {
      console.error(e);
    }
  }

  function focusEditor(editor: HTMLInputElement) {
    requestAnimationFrame(() => {
      editor.focus();
      editor.select();
    });
  }

  function resolveEditorStyle(
    node: MindMap["nodes"][string],
    offset: { x: number; y: number },
    position?: { left: number; top: number; width: number; height: number }
  ): EditorStyle | null {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const nodeW = getNodeWidth(node);
    const nodeH = NODE_HEIGHT;
    return {
      left: position?.left ?? rect.left + node.x + offset.x,
      top: position?.top ?? rect.top + node.y + offset.y,
      width: position?.width ?? nodeW,
      height: position?.height ?? nodeH
    };
  }

  function openEditor(
    map: MindMap,
    offset: { x: number; y: number },
    nodeId: string,
    position?: { left: number; top: number; width: number; height: number; content?: string }
  ) {
    const node = map.nodes[nodeId];
    if (!node) return;
    const editor = editorRef.current;
    if (!editor) return;
    const style = resolveEditorStyle(node, offset, position);
    if (!style) return;
    editor.value = position?.content ?? node.content;
    setEditorStyle(style);
    setIsEditing(true);
    focusEditor(editor);
  }

  function startEdit() {
    const tab = getActiveTab();
    if (!tab?.map) return;
    openEditor(tab.map, tab.offset, tab.map.selected_node_id);
  }

  async function finishEdit() {
    const tab = getActiveTab();
    if (!tab?.map || !isEditingRef.current) return;
    const editor = editorRef.current;
    if (!tab || !editor) return;
    const content = editor.value;
    const id = tab.map.selected_node_id;
    try {
      const result = await changeNodeUsecase(stateRef.current, deps, tab.id, id, content);
      setIsEditing(false);
      setEditorStyle(null);
      applyResult(result);
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

  async function selectNode(tab: TabState, nodeId: string) {
    const result = await selectNodeUsecase(stateRef.current, deps, tab.id, nodeId);
    applyResult(result);
  }

  function handleMouseDown(event: MouseEvent) {
    const dragState = dragStateRef.current;
    dragState.dragStart = { x: event.clientX, y: event.clientY };
    const activeTab = getActiveTab();
    dragState.lastOffset = activeTab?.offset ? { ...activeTab.offset } : defaultOffset();
    dragState.isDragging = false;

    if (!activeTab?.map) {
      dragState.isDragging = true;
      return;
    }
    const node = getNodeAt(activeTab.map, activeTab.offset, event.clientX, event.clientY);
    if (!node || node.id === activeTab.map.selected_node_id) {
      dragState.isDragging = true;
      return;
    }
    void selectNode(activeTab, node.id);
  }

  function handleMouseMove(event: MouseEvent) {
    const dragState = dragStateRef.current;
    if (dragState.isDragging) {
      const activeTab = getActiveTab();
      if (!activeTab) return;
      const dx = event.clientX - dragState.dragStart.x;
      const dy = event.clientY - dragState.dragStart.y;
      const nextOffset = {
        x: dragState.lastOffset.x + dx,
        y: dragState.lastOffset.y + dy
      };
      updateAppState((state) => updateTabState(state, activeTab.id, { offset: nextOffset }));
      if (activeTab.map) {
        renderCanvas(activeTab.map, nextOffset);
      }
    }
  }

  function handleMouseUp() {
    dragStateRef.current.isDragging = false;
  }

  function handleDoubleClick(event: MouseEvent) {
    const activeTab = getActiveTab();
    if (!activeTab?.map) return;
    const node = getNodeAt(activeTab.map, activeTab.offset, event.clientX, event.clientY);
    if (!node) return;
    const w = getNodeWidth(node);
    const h = NODE_HEIGHT;
    const point = getCanvasPoint(event.clientX, event.clientY);
    if (!point) return;
    const canvasX = node.x + activeTab.offset.x;
    const canvasY = node.y + activeTab.offset.y;
    openEditor(activeTab.map, activeTab.offset, node.id, {
      left: point.rect.left + canvasX,
      top: point.rect.top + canvasY,
      width: w,
      height: h,
      content: node.content
    });
  }

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    persistTheme(theme);
    updateThemeColors();
    renderActiveTab();
  }, [theme]);

  useEffect(() => {
    resizeCanvas();
    void ensureFontsLoaded().then(() => {
      updateThemeColors();
      renderActiveTab();
    });

    const observer = new ResizeObserver(() => {
      resizeCanvas();
      renderActiveTab();
    });
    if (canvasRef.current) observer.observe(canvasRef.current);

    const handleWindowResize = () => {
      resizeCanvas();
      renderActiveTab();
    };
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

  async function addNodeFromMenu(mode: "child" | "sibling") {
    const tab = getActiveTab();
    if (!tab?.map) return;
    await insertNodeWithEditor(tab, mode);
  }

  async function handleMenuAction(action: string) {
    if (action === "new") return createNewMap();
    if (action === "open") return openMap();
    if (action === "save") return saveMap(false);
    if (action === "save_as") return saveMap(true);
    if (action === "exit") return appWindow.close();
    if (action === "add_child") return addNodeFromMenu("child");
    if (action === "add_sibling") return addNodeFromMenu("sibling");
    if (action === "delete_node") {
      const tab = getActiveTab();
      if (tab) await removeSelectedNode(tab);
      return;
    }
    if (action === "rename_node") return startEdit();
    if (action === "about") {
      await dialog.ask(
        "BrainRust v0.1.0\n\nA FreeMind-compatible mind mapping tool built with Tauri + Rust + Canvas.",
        { title: "About BrainRust", kind: "info" }
      );
    }
  }

  useEffect(() => {
    let unlistenMenu: (() => void) | undefined;
    let unlistenRecent: (() => void) | undefined;

    events.listen("menu-event", async (event) => {
      const action = event.payload as string;
      await handleMenuAction(action);
    }).then((fn) => {
      unlistenMenu = fn;
    });

    events.listen("menu-open-recent", async (event) => {
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
      const hasDirtyTabs = stateRef.current.tabs.some((tab) => tab.isDirty);
      if (!hasDirtyTabs) return;
      event.preventDefault();
      const confirmed = await confirmCloseApp(stateRef.current, deps);
      if (confirmed) {
        await appWindow.destroy();
      }
    }).then((fn) => {
      unlistenClose = fn;
    });

    return () => {
      if (unlistenClose) unlistenClose();
    };
  }, []);

  async function handleTabShortcuts(event: KeyboardEvent, key: string, isAccel: boolean) {
    if (isAccel && key === "t") {
      event.preventDefault();
      await createNewTab();
      return true;
    }
    if (isAccel && key === "w") {
      event.preventDefault();
      const currentId = stateRef.current.activeTabId;
      if (currentId) await closeTab(currentId);
      return true;
    }
    if (isAccel && event.key === "Tab") {
      event.preventDefault();
      cycleTab(event.shiftKey ? -1 : 1);
      return true;
    }
    return false;
  }

  async function handleEditingKeys(event: KeyboardEvent) {
    if (!isEditingRef.current) return false;
    if (event.key === "Enter") await finishEdit();
    if (event.key === "Escape") cancelEdit();
    return true;
  }

  function directionFromKey(key: string) {
    if (key === "ArrowRight") return "Right";
    if (key === "ArrowLeft") return "Left";
    if (key === "ArrowDown") return "Down";
    if (key === "ArrowUp") return "Up";
    return null;
  }

  async function navigateSelection(tab: TabState, direction: string) {
    const result = await navigateSelectionUsecase(stateRef.current, deps, tab.id, direction);
    applyResult(result);
    return Boolean(result.render);
  }

  async function handleNavigationKeys(event: KeyboardEvent, tab: TabState) {
    const direction = directionFromKey(event.key);
    if (!direction) return false;
    event.preventDefault();
    return navigateSelection(tab, direction);
  }

  async function insertNodeWithEditor(tab: TabState, mode: "child" | "sibling") {
    const result = await addNodeUsecase(stateRef.current, deps, tab.id, mode);
    applyResult(result);
    const updatedTab = getTabByIdState(result.state, tab.id);
    if (updatedTab?.map) {
      openEditor(updatedTab.map, updatedTab.offset, updatedTab.map.selected_node_id);
    }
  }

  async function removeSelectedNode(tab: TabState) {
    const result = await removeSelectedNodeUsecase(stateRef.current, deps, tab.id);
    applyResult(result);
  }

  async function handleInsertKeys(event: KeyboardEvent, tab: TabState) {
    if (event.key !== "Enter" && event.key !== "Insert") return false;
    const mode = event.key === "Insert" ? "child" : "sibling";
    await insertNodeWithEditor(tab, mode);
    return true;
  }

  async function handleDeleteOrRename(event: KeyboardEvent, tab: TabState) {
    if (event.key === "F2") {
      startEdit();
      return true;
    }
    if (event.key !== "Delete") return false;
    await removeSelectedNode(tab);
    return true;
  }

  async function handleFileShortcuts(event: KeyboardEvent, key: string, isAccel: boolean) {
    if (!isAccel || (key !== "s" && key !== "o")) return false;
    event.preventDefault();
    if (key === "s") await saveMap(false);
    if (key === "o") await openMap();
    return true;
  }

  useEffect(() => {
    const handleKeyDown = async (event: KeyboardEvent) => {
      const isAccel = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();
      if (await handleTabShortcuts(event, key, isAccel)) return;
      if (await handleEditingKeys(event)) return;
      const tab = getActiveTab();
      if (!tab) return;
      if (await handleNavigationKeys(event, tab)) return;
      if (await handleInsertKeys(event, tab)) return;
      if (await handleDeleteOrRename(event, tab)) return;
      await handleFileShortcuts(event, key, isAccel);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div className="flex h-full w-full bg-[var(--app-bg)] text-[var(--text-color)]">
      <Sidebar
        theme={theme}
        iconButtons={iconButtons}
        onToggleTheme={() => applyTheme(theme === "dark" ? "light" : "dark")}
        onIconClick={(key) => void handleIconClick(key)}
      />

      <div className="relative flex h-full flex-1 flex-col">
        <TabBar
          tabs={appState.tabs}
          activeTabId={appState.activeTabId}
          onSelectTab={(tabId) => void switchToTab(tabId)}
          onCloseTab={(tabId) => void closeTab(tabId)}
          onNewTab={() => void createNewTab()}
        />

        <CanvasView
          canvasRef={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onDoubleClick={handleDoubleClick}
        />
      </div>
      <NodeEditor
        editorRef={editorRef}
        isEditing={isEditing}
        style={editorStyle}
        onBlur={() => {
          if (isEditingRef.current) void finishEdit();
        }}
      />
    </div>
  );
}
