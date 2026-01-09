import { useCallback, useEffect, useMemo, useRef } from "preact/hooks";
import { iconKeys } from "./constants/icons";
import { openFilters, saveFilters } from "./constants/fileDialogs";
import { NODE_FONT_LOAD } from "./constants/typography";
import { CanvasView } from "./components/CanvasView";
import { CloudPanel } from "./components/CloudPanel";
import { CloudOpenDialog } from "./components/CloudOpenDialog";
import { CloudSaveDialog } from "./components/CloudSaveDialog";
import { NodeEditor } from "./components/NodeEditor";
import { SaveTargetDialog } from "./components/SaveTargetDialog";
import { Sidebar } from "./components/Sidebar";
import { TabBar } from "./components/TabBar";
import { useCanvasRenderer } from "./hooks/useCanvasRenderer";
import { useThemeHandler } from "./hooks/useThemeHandler";
import { useAppDependencies } from "./hooks/useAppDependencies";
import { useAppState } from "./hooks/useAppState";
import { useNodeEditorState } from "./hooks/useNodeEditorState";
import { useMapOperations } from "./hooks/useMapOperations";
import { useCloudState } from "./hooks/useCloudState";
import { useFileOperations } from "./hooks/useFileOperations";
import { useCanvasInteraction } from "./hooks/useCanvasInteraction";
import { useAppShortcuts } from "./hooks/useAppShortcuts";
import { useMenuHandler } from "./hooks/useMenuHandler";
import { dialog } from "../infrastructure/tauri/dialogApi";
import { appWindow } from "../infrastructure/tauri/windowApi";
import { isSupabaseConfigured } from "../infrastructure/supabase/client";
import { confirmCloseApp } from "../application/usecases/appClose";
import type { UsecaseResult } from "../application/usecases/result";
import { formatTitle } from "../application/usecases/title";

// TODO: DaisyUI pouzit? https://daisyui.com/docs/install/ 

export function App() {
  const { theme, applyTheme, themeColorsRef, updateThemeColors } = useThemeHandler();
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
  const {
    isEditing,
    isEditingRef,
    editorRef,
    editorStyle,
    openEditor,
    closeEditor
  } = useNodeEditorState(canvasRef, getNodeWidth);
  const deps = useAppDependencies(getLayoutConfig, getViewportSize);
  const handleRender = useCallback((result: UsecaseResult) => {
    if (!result.render) return;
    renderCanvas(result.render.map, result.render.offset);
  }, [renderCanvas]);
  const {
    appState,
    stateRef,
    updateAppState,
    applyResult,
    createNewTab,
    closeTab,
    switchToTab,
    cycleTab,
    openMapPath,
    getActiveTab
  } = useAppState(deps, handleRender);
  const mapOps = useMapOperations({ stateRef, deps, applyResult, getActiveTab });
  const cloudState = useCloudState({
    stateRef,
    deps,
    applyResult,
    isSupabaseConfigured
  });
  const fileOps = useFileOperations({
    stateRef,
    deps,
    applyResult,
    updateAppState,
    getActiveTab,
    saveFilters,
    openFilters,
    cloudSessionRef: cloudState.cloudSessionRef,
    runCloudAction: cloudState.runCloudAction,
    refreshCloudMaps: cloudState.refreshCloudMaps,
    isCloudAvailable: cloudState.isCloudAvailable,
    isOffline: cloudState.isOffline,
    setCloudError: cloudState.setCloudError
  });
  const canvasInteraction = useCanvasInteraction({
    getActiveTab,
    updateAppState,
    renderCanvas,
    getNodeAt,
    getCanvasPoint,
    getNodeWidth,
    openEditor,
    getViewportSize,
    onSelectNode: mapOps.selectNode
  });
  const {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleDoubleClick
  } = canvasInteraction;

  useEffect(() => {
    const activeTab = appState.tabs.find((tab) => tab.id === appState.activeTabId);
    if (activeTab?.map) {
      renderCanvas(activeTab.map, activeTab.offset);
    }
  }, [appState, renderCanvas]);

  const iconButtons = useMemo(() => iconKeys.filter((key) => key !== "trash"), []);
  const didInitRef = useRef(false);
  const isFinishingEditRef = useRef(false);

  async function ensureFontsLoaded() {
    if (!document.fonts) return;
    try {
      await document.fonts.load(NODE_FONT_LOAD);
      await document.fonts.ready;
    } catch (e) {
      console.warn("Failed to load fonts", e);
    }
  }

  const renderActiveTab = useCallback(() => {
    const tab = getActiveTab();
    if (!tab?.map) return;
    renderCanvas(tab.map, tab.offset);
  }, [getActiveTab, renderCanvas]);

  async function openCloudBrowserDialog() {
    if (cloudState.cloudSession?.user.email) {
      await cloudState.refreshCloud();
    }
    cloudState.setIsCloudOpenDialogOpen(true);
  }

  async function handleIconClick(key: string) {
    try {
      await mapOps.updateIcon(key);
    } catch (e) {
      console.error(e);
    }
  }


  function startEdit() {
    const tab = getActiveTab();
    if (!tab?.map) return;
    openEditor(tab.map, tab.offset, tab.map.selected_node_id);
  }

  async function finishEdit() {
    const tab = getActiveTab();
    if (!tab?.map || !isEditingRef.current) return;
    if (isFinishingEditRef.current) return;
    const editor = editorRef.current;
    if (!tab || !editor) return;
    isFinishingEditRef.current = true;
    const content = editor.value;
    const id = tab.map.selected_node_id;
    try {
      await mapOps.changeNode(id, content);
      closeEditor();
    } catch (e) {
      console.error(e);
    } finally {
      isFinishingEditRef.current = false;
    }
  }

  const insertNodeWithEditor = useCallback(async (mode: "child" | "sibling") => {
    const updatedTab = await mapOps.addNode(mode);
    if (updatedTab?.map) {
      openEditor(updatedTab.map, updatedTab.offset, updatedTab.map.selected_node_id);
    }
  }, [mapOps, openEditor]);

  const removeSelectedNode = useCallback(async () => {
    await mapOps.removeSelectedNode();
  }, [mapOps]);


  useEffect(() => {
    updateThemeColors();
    renderActiveTab();
  }, [theme, updateThemeColors, renderActiveTab]);

  useEffect(() => {
    if (!didInitRef.current) {
      didInitRef.current = true;
      if (stateRef.current.tabs.length === 0) {
        void createNewTab();
      }
    }

    resizeCanvas();
    void ensureFontsLoaded().then(() => {
      updateThemeColors();
      renderActiveTab();
    });

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => {
        resizeCanvas();
        renderActiveTab();
      });
      if (canvasRef.current) observer.observe(canvasRef.current);
    }

    const handleWindowResize = () => {
      resizeCanvas();
      renderActiveTab();
    };
    window.addEventListener("resize", handleWindowResize);

    const handleWindowMouseUp = () => {
      handleMouseUp();
    };
    window.addEventListener("mouseup", handleWindowMouseUp);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", handleWindowResize);
      window.removeEventListener("mouseup", handleWindowMouseUp);
    };
  }, [canvasRef, renderActiveTab, resizeCanvas, updateThemeColors, createNewTab, handleMouseUp]);

  async function addNodeFromMenu(mode: "child" | "sibling") {
    await insertNodeWithEditor(mode);
  }

  useAppShortcuts({
    isEditingRef,
    getActiveTab,
    createNewTab,
    closeTab,
    cycleTab,
    finishEdit,
    closeEditor,
    navigateSelection: mapOps.navigateSelection,
    addNodeWithEditor: insertNodeWithEditor,
    removeSelectedNode,
    startEdit,
    saveActiveTab: fileOps.saveActiveTab,
    openMap: fileOps.openMap
  });

  useMenuHandler({
    onNew: createNewTab,
    onOpen: fileOps.openMap,
    onSave: () => fileOps.saveActiveTab(false),
    onSaveAs: () => fileOps.saveActiveTab(true),
    onSaveCloud: fileOps.saveToCloud,
    onOpenCloud: () => {
      void openCloudBrowserDialog();
    },
    onCloudAuth: () => cloudState.setIsCloudOpen(true),
    onExit: () => appWindow.close(),
    onAddChild: () => addNodeFromMenu("child"),
    onAddSibling: () => addNodeFromMenu("sibling"),
    onDeleteNode: removeSelectedNode,
    onRenameNode: startEdit,
    onAbout: () =>
      dialog.ask(
        "BrainRust v0.1.0\n\nA FreeMind-compatible mind mapping tool built with Tauri + Rust + Canvas.",
        { title: "About BrainRust", kind: "info" }
      ),
    onOpenRecent: openMapPath
  });

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
  }, [deps]);

  const activeTab = getActiveTab();
  const canSaveCloud = Boolean(activeTab?.map && cloudState.isCloudAvailable());

  return (
    <div className="flex h-full w-full bg-[var(--app-bg)] text-[var(--text-color)]">
      <Sidebar
        theme={theme}
        iconButtons={iconButtons}
        onThemeChange={(nextTheme) => applyTheme(nextTheme)}
        onIconClick={(key) => void handleIconClick(key)}
      />

      <div className="relative flex h-full flex-1 min-h-0 flex-col">
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
        onKeyDown={(event) => {
          if (!isEditingRef.current) return;
          if (event.key === "Enter") {
            event.preventDefault();
            event.stopPropagation();
            void finishEdit();
          }
          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            closeEditor();
          }
        }}
      />
      <CloudPanel
        isOpen={cloudState.isCloudOpen}
        isConfigured={isSupabaseConfigured}
        isLoading={cloudState.cloudBusy}
        error={cloudState.cloudError}
        sessionEmail={cloudState.cloudSession?.user.email ?? null}
        maps={cloudState.cloudMaps}
        canSave={canSaveCloud}
        onClose={() => cloudState.setIsCloudOpen(false)}
        onSignIn={cloudState.signInCloud}
        onSignUp={cloudState.signUpCloud}
        onSignOut={cloudState.signOutCloud}
        onRefresh={cloudState.refreshCloud}
        onLoadMap={cloudState.loadCloudMap}
        onSaveMap={fileOps.saveToCloud}
      />
      <CloudOpenDialog
        isOpen={cloudState.isCloudOpenDialogOpen}
        isLoggedIn={Boolean(cloudState.cloudSession?.user.email)}
        isLoading={cloudState.cloudBusy}
        error={cloudState.cloudError}
        maps={cloudState.cloudMaps}
        sort={cloudState.cloudSort}
        onSortChange={cloudState.setCloudSort}
        onRefresh={cloudState.refreshCloud}
        onSelect={async (mapId) => {
          await cloudState.loadCloudMap(mapId);
          cloudState.setIsCloudOpenDialogOpen(false);
        }}
        onOpenAccount={() => {
          cloudState.setIsCloudOpenDialogOpen(false);
          cloudState.setIsCloudOpen(true);
        }}
        onClose={() => cloudState.setIsCloudOpenDialogOpen(false)}
      />
      <CloudSaveDialog
        isOpen={fileOps.isCloudSaveDialogOpen}
        isLoggedIn={Boolean(cloudState.cloudSession?.user.email)}
        isLoading={cloudState.cloudBusy}
        error={cloudState.cloudError}
        defaultTitle={fileOps.cloudSaveTitle}
        onSave={fileOps.confirmCloudSave}
        onOpenAccount={() => {
          fileOps.setIsCloudSaveDialogOpen(false);
          cloudState.setIsCloudOpen(true);
        }}
        onClose={() => fileOps.setIsCloudSaveDialogOpen(false)}
      />
      <SaveTargetDialog
        isOpen={fileOps.isSaveTargetOpen}
        onClose={() => fileOps.resolveSaveTarget(null)}
        onSelect={(target) => fileOps.resolveSaveTarget(target)}
      />
    </div>
  );
}
