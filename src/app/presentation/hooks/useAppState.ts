import { useCallback, useEffect, useReducer, useRef, useState } from "preact/hooks";
import type { AppState, TabState } from "../../application/state/tabState";
import {
  getActiveTab as getActiveTabState
} from "../../application/state/tabState";
import { tabLifecycleReducer } from "../../application/state/tabLifecycle";
import type { AppDependencies } from "../../application/usecases/types";
import type { UsecaseResult } from "../../application/usecases/result";
import {
  closeTab as closeTabUsecase,
  createNewTab as createNewTabUsecase,
  openMapPath as openMapPathUsecase,
  switchToTab as switchToTabUsecase
} from "../../application/usecases/tabs";

type RenderHandler = (result: UsecaseResult) => void;

export function useAppState(deps: AppDependencies, onRender: RenderHandler) {
  const [appState, setAppState] = useState<AppState>({
    tabs: [],
    activeTabId: null
  });
  const [tabLifecycle, dispatchTabLifecycle] = useReducer(tabLifecycleReducer, { status: "idle" });
  const lifecycleRef = useRef(tabLifecycle);
  const stateRef = useRef<AppState>(appState);
  const untitledCounterRef = useRef(1);

  useEffect(() => {
    stateRef.current = appState;
  }, [appState]);

  useEffect(() => {
    lifecycleRef.current = tabLifecycle;
  }, [tabLifecycle]);

  const updateAppState = useCallback((updater: (state: AppState) => AppState) => {
    setAppState((prev) => updater(prev));
  }, []);

  const applyResult = useCallback((result: UsecaseResult) => {
    updateAppState(() => result.state);
    onRender(result);
  }, [onRender, updateAppState]);

  const nextUntitledTitle = useCallback(() => {
    const value = untitledCounterRef.current++;
    return `Untitled ${value}`;
  }, []);

  const createNewTab = useCallback(async () => {
    try {
      if (lifecycleRef.current.status !== "idle") return;
      dispatchTabLifecycle({ type: "start_create" });
      const result = await createNewTabUsecase(stateRef.current, deps, nextUntitledTitle());
      applyResult(result);
    } catch (e) {
      console.error(e);
    } finally {
      dispatchTabLifecycle({ type: "finish" });
    }
  }, [applyResult, deps, nextUntitledTitle]);

  const closeTab = useCallback(async (tabId: string) => {
    try {
      if (lifecycleRef.current.status !== "idle") return;
      dispatchTabLifecycle({ type: "start_close" });
      const willCloseLast = stateRef.current.tabs.length === 1;
      const fallback = willCloseLast ? nextUntitledTitle() : `Untitled ${untitledCounterRef.current}`;
      const result = await closeTabUsecase(stateRef.current, deps, tabId, fallback);
      applyResult(result);
    } catch (e) {
      console.error(e);
    } finally {
      dispatchTabLifecycle({ type: "finish" });
    }
  }, [applyResult, deps, nextUntitledTitle]);

  const switchToTab = useCallback(async (tabId: string) => {
    try {
      const result = await switchToTabUsecase(stateRef.current, deps, tabId, true);
      applyResult(result);
    } catch (e) {
      console.error(e);
    }
  }, [applyResult, deps]);

  const cycleTab = useCallback((step: number) => {
    const currentTabs = stateRef.current.tabs;
    const currentId = stateRef.current.activeTabId;
    if (currentTabs.length < 2 || !currentId) return;
    const currentIndex = currentTabs.findIndex((tab) => tab.id === currentId);
    if (currentIndex === -1) return;
    const nextIndex = (currentIndex + step + currentTabs.length) % currentTabs.length;
    void switchToTab(currentTabs[nextIndex].id);
  }, [switchToTab]);

  const openMapPath = useCallback(async (path: string) => {
    try {
      const result = await openMapPathUsecase(stateRef.current, deps, path);
      applyResult(result);
    } catch (e) {
      console.error(e);
    }
  }, [applyResult, deps]);

  const getActiveTab = useCallback((): TabState | null => {
    return getActiveTabState(stateRef.current);
  }, []);

  return {
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
  };
}
