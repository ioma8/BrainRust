import { useCallback } from "preact/hooks";
import type { AppState, TabState } from "../../application/state/tabState";
import type { AppDependencies } from "../../application/usecases/types";
import type { UsecaseResult } from "../../application/usecases/result";
import {
  addNode as addNodeUsecase,
  changeNode as changeNodeUsecase,
  removeSelectedNode as removeSelectedNodeUsecase,
  updateIcon as updateIconUsecase
} from "../../application/usecases/nodes";
import {
  navigateSelection as navigateSelectionUsecase,
  selectNode as selectNodeUsecase
} from "../../application/usecases/selection";
import { getTabById } from "../../application/state/tabState";

type MapOpsDeps = {
  stateRef: { current: AppState };
  deps: AppDependencies;
  applyResult: (result: UsecaseResult) => void;
  getActiveTab: () => TabState | null;
};

export function useMapOperations({ stateRef, deps, applyResult, getActiveTab }: MapOpsDeps) {
  const addNode = useCallback(async (mode: "child" | "sibling") => {
    const tab = getActiveTab();
    if (!tab?.map) return null;
    try {
      const result = await addNodeUsecase(stateRef.current, deps, tab.id, mode);
      applyResult(result);
      return getTabById(result.state, tab.id);
    } catch (e) {
      console.error(e);
      return null;
    }
  }, [applyResult, deps, getActiveTab, stateRef]);

  const removeSelectedNode = useCallback(async () => {
    const tab = getActiveTab();
    if (!tab?.map) return;
    try {
      const result = await removeSelectedNodeUsecase(stateRef.current, deps, tab.id);
      applyResult(result);
    } catch (e) {
      console.error(e);
    }
  }, [applyResult, deps, getActiveTab, stateRef]);

  const changeNode = useCallback(async (nodeId: string, content: string) => {
    const tab = getActiveTab();
    if (!tab?.map) return;
    try {
      const result = await changeNodeUsecase(stateRef.current, deps, tab.id, nodeId, content);
      applyResult(result);
    } catch (e) {
      console.error(e);
    }
  }, [applyResult, deps, getActiveTab, stateRef]);

  const updateIcon = useCallback(async (icon: string) => {
    const tab = getActiveTab();
    if (!tab?.map) return;
    try {
      const result = await updateIconUsecase(stateRef.current, deps, tab.id, icon);
      applyResult(result);
    } catch (e) {
      console.error(e);
    }
  }, [applyResult, deps, getActiveTab, stateRef]);

  const selectNode = useCallback(async (nodeId: string) => {
    const tab = getActiveTab();
    if (!tab?.map) return;
    try {
      const result = await selectNodeUsecase(stateRef.current, deps, tab.id, nodeId);
      applyResult(result);
    } catch (e) {
      console.error(e);
    }
  }, [applyResult, deps, getActiveTab, stateRef]);

  const navigateSelection = useCallback(async (direction: string) => {
    const tab = getActiveTab();
    if (!tab?.map) return false;
    try {
      const result = await navigateSelectionUsecase(stateRef.current, deps, tab.id, direction);
      applyResult(result);
      return Boolean(result.render);
    } catch (e) {
      console.error(e);
      return false;
    }
  }, [applyResult, deps, getActiveTab, stateRef]);

  return {
    addNode,
    removeSelectedNode,
    changeNode,
    updateIcon,
    selectNode,
    navigateSelection
  };
}
