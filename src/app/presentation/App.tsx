import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import type { MindMap } from "../../types";
import { NODE_HEIGHT } from "../domain/values/layout";
import { iconKeys } from "./constants/icons";
import { openFilters, saveFilters } from "./constants/fileDialogs";
import { NODE_FONT_LOAD } from "./constants/typography";
import { computeLayout } from "../domain/layout/layout";
import { computeFitOffset, ensureVisible } from "../domain/layout/viewport";
import {
  defaultThemeColors,
  loadTheme,
  persistTheme,
  resolveThemeColors,
  type Theme,
  type ThemeColors
} from "./theme/theme";
import {
  addTab as addTabState,
  closeTab as closeTabState,
  getActiveTab as getActiveTabState,
  getTabById as getTabByIdState,
  markTabDirty as markTabDirtyState,
  setActiveTab as setActiveTabState,
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



function fileNameFromPath(path: string) {
  return path.split(/[\\/]/).pop() || path;
}

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

  function getTabById(tabId: string): TabState | null {
    return getTabByIdState(stateRef.current, tabId);
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

  async function markDirty() {
    const tab = getActiveTab();
    if (!tab || tab.isDirty) return;
    updateAppState((state) => markTabDirtyState(state, tab.id));
    await updateTitle();
  }

  function withUpdatedTitle(tab: TabState): TabState {
    if (!tab.filePath) return tab;
    return { ...tab, title: fileNameFromPath(tab.filePath) };
  }


  function applyMapState(
    tabId: string,
    map: MindMap,
    fit = false
  ): { map: MindMap; offset: { x: number; y: number } } {
    const tab = getTabById(tabId);
    const layoutConfig = getLayoutConfig();
    const laidOutMap = computeLayout(map, layoutConfig);
    const viewport = getViewportSize();
    const nextOffset = fit
      ? computeFitOffset(laidOutMap, viewport, layoutConfig)
      : (tab?.offset ?? defaultOffset());
    updateAppState((state) => updateTabState(state, tabId, { map: laidOutMap, offset: nextOffset }));
    renderCanvas(laidOutMap, nextOffset);
    return { map: laidOutMap, offset: nextOffset };
  }

  function applySelection(tabId: string, selectedId: string) {
    const tab = getTabById(tabId);
    if (!tab?.map) return;
    const updatedMap = { ...tab.map, selected_node_id: selectedId };
    updateAppState((state) => updateTabState(state, tabId, { map: updatedMap }));
    renderCanvas(updatedMap, tab.offset);
  }

  function applyOffset(tabId: string, map: MindMap, offset: { x: number; y: number }) {
    updateAppState((state) => updateTabState(state, tabId, { offset }));
    renderCanvas(map, offset);
  }

  function ensureVisibleOffset(map: MindMap, offset: { x: number; y: number }, nodeId: string) {
    const viewport = getViewportSize();
    return ensureVisible(map, offset, nodeId, viewport, getLayoutConfig());
  }

  async function loadMapState(tabId: string, fit = false) {
    try {
      const map = await mindmapApi.getMap(tabId);
      applyMapState(tabId, map, fit);
    } catch (e) {
      console.error("Failed to load map:", e);
    }
  }

  function buildTab(tabId: string, title: string, filePath: string | null): TabState {
    return {
      id: tabId,
      title,
      filePath,
      isDirty: false,
      map: null,
      offset: defaultOffset()
    };
  }

  function addTabAndSelect(tab: TabState) {
    updateAppState((state) => addTabState(state, tab, true));
  }

  function replaceTab(updatedTab: TabState) {
    updateAppState((state) => updateTabState(state, updatedTab.id, updatedTab));
  }

  async function initializeNewTab(tab: TabState) {
    const map = await mindmapApi.newMap(tab.id);
    const layoutConfig = getLayoutConfig();
    const laidOutMap = computeLayout(map, layoutConfig);
    const offset = computeFitOffset(laidOutMap, getViewportSize(), layoutConfig);
    const updatedTab = { ...tab, map: laidOutMap, offset };
    replaceTab(updatedTab);
    renderCanvas(laidOutMap, offset);
    await updateTitle(updatedTab);
  }

  async function createNewTab() {
    const tabId = crypto.randomUUID();
    const tab = buildTab(tabId, `Untitled ${untitledCounterRef.current++}`, null);
    addTabAndSelect(tab);
    try {
      await initializeNewTab(tab);
    } catch (e) {
      console.error(e);
    }
  }

  async function confirmCloseTab(tab: TabState): Promise<boolean> {
    if (!tab.isDirty) return true;
    return dialog.confirm("You have unsaved changes. Close this tab?", {
      kind: "warning",
      title: "Unsaved Changes"
    });
  }

  async function closeTabBackend(tabId: string) {
    try {
      await mindmapApi.closeTab(tabId);
    } catch (e) {
      console.error(e);
    }
  }

  function pickNextTab(tabs: TabState[], closedIndex: number): TabState | null {
    return tabs[closedIndex] || tabs[closedIndex - 1] || null;
  }

  async function activateTab(tab: TabState, fit = false) {
    updateAppState((state) => setActiveTabState(state, tab.id));
    if (tab.map) {
      renderCanvas(tab.map, tab.offset);
    } else {
      await loadMapState(tab.id, fit);
    }
    await updateTitle(tab);
  }

  async function closeTab(tabId: string) {
    const currentState = stateRef.current;
    const tabIndex = currentState.tabs.findIndex((tab) => tab.id === tabId);
    if (tabIndex === -1) return;
    const tab = currentState.tabs[tabIndex];
    const confirmed = await confirmCloseTab(tab);
    if (!confirmed) return;
    await closeTabBackend(tabId);

    const nextState = closeTabState(currentState, tabId).state;
    updateAppState(() => nextState);

    if (nextState.tabs.length === 0) {
      await createNewTab();
      return;
    }

    if (tabId === currentState.activeTabId) {
      const nextTab = pickNextTab(nextState.tabs, tabIndex);
      if (nextTab) await activateTab(nextTab, true);
    } else {
      await updateTitle();
    }
  }

  async function switchToTab(tabId: string) {
    if (tabId === stateRef.current.activeTabId) return;
    const tab = stateRef.current.tabs.find((item) => item.id === tabId);
    if (!tab) return;
    await activateTab(tab, true);
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
    const existingTab = stateRef.current.tabs.find((tab) => tab.filePath === path);
    if (existingTab) {
      await switchToTab(existingTab.id);
      return;
    }

    const tabId = crypto.randomUUID();
    const tab = buildTab(tabId, fileNameFromPath(path), path);
    addTabAndSelect(tab);

    try {
      await mindmapApi.newMap(tabId);
      const map = await mindmapApi.loadMap(tabId, path);
      const { map: laidOutMap, offset } = applyMapState(tabId, map, true);
      const updatedTab = withUpdatedTitle({ ...tab, filePath: path, isDirty: false, map: laidOutMap, offset });
      replaceTab(updatedTab);
      await updateTitle(updatedTab);
    } catch (e) {
      console.error(e);
    }
  }

  async function openMap() {
    try {
      const path = await dialog.open({
        multiple: false,
        directory: false,
        filters: openFilters
      });

      if (typeof path === "string") {
        await openMapPath(path);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function pickSavePath(tab: TabState, saveAs: boolean) {
    if (!saveAs && tab.filePath) return tab.filePath;
    return dialog.save({
      filters: saveFilters,
      defaultPath: tab.filePath || undefined
    });
  }

  async function persistTabMap(tab: TabState, path: string) {
    const savedPath = await mindmapApi.saveMap(tab.id, path);
    const updatedTab = withUpdatedTitle({ ...tab, filePath: savedPath, isDirty: false });
    replaceTab(updatedTab);
    await updateTitle(updatedTab);
  }

  async function saveMap(saveAs = false) {
    const tab = getActiveTab();
    if (!tab) return;
    try {
      const path = await pickSavePath(tab, saveAs);
      if (path) await persistTabMap(tab, path);
    } catch (e) {
      console.error("Save failed:", e);
    }
  }

  async function handleIconClick(key: string) {
    const tab = getActiveTab();
    if (!tab?.map) return;
    const id = tab.map.selected_node_id;
    try {
      const updatedMap = key === "trash"
        ? await mindmapApi.removeLastIcon(tab.id, id)
        : await mindmapApi.addIcon(tab.id, id, key);
      await markDirty();
      applyMapState(tab.id, updatedMap);
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
      const updatedMap = await mindmapApi.changeNode(tab.id, id, content);
      await markDirty();
      setIsEditing(false);
      setEditorStyle(null);
      applyMapState(tab.id, updatedMap);
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
    const selectedId = await mindmapApi.selectNode(tab.id, nodeId);
    applySelection(tab.id, selectedId);
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
      if (hasDirtyTabs) {
        event.preventDefault();
        const confirmed = await dialog.confirm(
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
    const selectedId = await mindmapApi.navigate(tab.id, direction);
    if (!selectedId || !tab.map) return true;
    const nextMap = { ...tab.map, selected_node_id: selectedId };
    applySelection(tab.id, selectedId);
    const visibleOffset = ensureVisibleOffset(nextMap, tab.offset, selectedId);
    if (visibleOffset.x !== tab.offset.x || visibleOffset.y !== tab.offset.y) {
      applyOffset(tab.id, nextMap, visibleOffset);
    }
    return true;
  }

  async function handleNavigationKeys(event: KeyboardEvent, tab: TabState) {
    const direction = directionFromKey(event.key);
    if (!direction) return false;
    event.preventDefault();
    return navigateSelection(tab, direction);
  }

  async function addNode(tab: TabState, mode: "child" | "sibling") {
    if (!tab.map) return null;
    if (mode === "sibling" && tab.map.selected_node_id === tab.map.root_id) {
      mode = "child";
    }
    if (mode === "child") {
      return mindmapApi.addChild(tab.id, tab.map.selected_node_id, "New Node");
    }
    return mindmapApi.addSibling(tab.id, tab.map.selected_node_id, "New Node");
  }

  async function insertNodeWithEditor(tab: TabState, mode: "child" | "sibling") {
    const updatedMap = await addNode(tab, mode);
    if (!updatedMap) return;
    await markDirty();
    const { map: laidOutMap, offset } = applyMapState(tab.id, updatedMap);
    const visibleOffset = ensureVisibleOffset(laidOutMap, offset, laidOutMap.selected_node_id);
    if (visibleOffset.x !== offset.x || visibleOffset.y !== offset.y) {
      applyOffset(tab.id, laidOutMap, visibleOffset);
    }
    openEditor(laidOutMap, visibleOffset, laidOutMap.selected_node_id);
  }

  async function removeSelectedNode(tab: TabState) {
    if (!tab.map || tab.map.selected_node_id === tab.map.root_id) return;
    const updatedMap = await mindmapApi.removeNode(tab.id, tab.map.selected_node_id);
    await markDirty();
    applyMapState(tab.id, updatedMap);
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
