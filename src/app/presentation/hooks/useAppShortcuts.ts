import { useCallback, useEffect } from "preact/hooks";
import type { TabState } from "../../application/state/tabState";

type ShortcutDeps = {
  isEditingRef: { current: boolean };
  getActiveTab: () => TabState | null;
  createNewTab: () => Promise<void>;
  closeTab: (id: string) => Promise<void>;
  cycleTab: (step: number) => void;
  finishEdit: () => Promise<void>;
  closeEditor: () => void;
  navigateSelection: (direction: string) => Promise<boolean>;
  addNodeWithEditor: (mode: "child" | "sibling") => Promise<void>;
  removeSelectedNode: () => Promise<void>;
  startEdit: () => void;
  saveActiveTab: (saveAs: boolean) => Promise<void>;
  openMap: () => Promise<void>;
};

export function useAppShortcuts({
  isEditingRef,
  getActiveTab,
  createNewTab,
  closeTab,
  cycleTab,
  finishEdit,
  closeEditor,
  navigateSelection,
  addNodeWithEditor,
  removeSelectedNode,
  startEdit,
  saveActiveTab,
  openMap
}: ShortcutDeps) {
  const handleTabShortcuts = useCallback(async (event: KeyboardEvent, key: string, isAccel: boolean) => {
    if (isAccel && key === "t") {
      event.preventDefault();
      await createNewTab();
      return true;
    }
    if (isAccel && key === "w") {
      event.preventDefault();
      const currentId = getActiveTab()?.id;
      if (currentId) await closeTab(currentId);
      return true;
    }
    if (isAccel && event.key === "Tab") {
      event.preventDefault();
      cycleTab(event.shiftKey ? -1 : 1);
      return true;
    }
    return false;
  }, [closeTab, createNewTab, cycleTab, getActiveTab]);

  const handleEditingKeys = useCallback(async (event: KeyboardEvent) => {
    if (!isEditingRef.current) return false;
    if (event.key === "Enter") await finishEdit();
    if (event.key === "Escape") closeEditor();
    return true;
  }, [closeEditor, finishEdit, isEditingRef]);

  const directionFromKey = useCallback((key: string) => {
    if (key === "ArrowRight") return "Right";
    if (key === "ArrowLeft") return "Left";
    if (key === "ArrowDown") return "Down";
    if (key === "ArrowUp") return "Up";
    return null;
  }, []);

  const handleNavigationKeys = useCallback(async (event: KeyboardEvent) => {
    const direction = directionFromKey(event.key);
    if (!direction) return false;
    event.preventDefault();
    return navigateSelection(direction);
  }, [directionFromKey, navigateSelection]);

  const handleInsertKeys = useCallback(async (event: KeyboardEvent) => {
    if (event.key !== "Enter" && event.key !== "Insert") return false;
    const mode = event.key === "Insert" ? "child" : "sibling";
    await addNodeWithEditor(mode);
    return true;
  }, [addNodeWithEditor]);

  const handleDeleteOrRename = useCallback(async (event: KeyboardEvent) => {
    if (event.key === "F2") {
      startEdit();
      return true;
    }
    if (event.key !== "Delete") return false;
    await removeSelectedNode();
    return true;
  }, [removeSelectedNode, startEdit]);

  const handleFileShortcuts = useCallback(async (event: KeyboardEvent, key: string, isAccel: boolean) => {
    if (!isAccel || (key !== "s" && key !== "o")) return false;
    event.preventDefault();
    if (key === "s") await saveActiveTab(false);
    if (key === "o") await openMap();
    return true;
  }, [openMap, saveActiveTab]);

  useEffect(() => {
    const handleKeyDown = async (event: KeyboardEvent) => {
      const isAccel = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();
      if (await handleTabShortcuts(event, key, isAccel)) return;
      if (await handleEditingKeys(event)) return;
      if (await handleNavigationKeys(event)) return;
      if (await handleInsertKeys(event)) return;
      if (await handleDeleteOrRename(event)) return;
      await handleFileShortcuts(event, key, isAccel);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    handleTabShortcuts,
    handleEditingKeys,
    handleNavigationKeys,
    handleInsertKeys,
    handleDeleteOrRename,
    handleFileShortcuts
  ]);
}
