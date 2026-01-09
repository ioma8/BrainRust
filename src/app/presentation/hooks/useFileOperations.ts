import { useCallback, useRef, useState } from "preact/hooks";
import type { TabState, AppState } from "../../application/state/tabState";
import type { AppDependencies } from "../../application/usecases/types";
import type { UsecaseResult } from "../../application/usecases/result";
import type { DialogFilter } from "../../application/ports/dialogPort";
import { openFromDialog as openFromDialogUsecase, saveMap as saveMapUsecase } from "../../application/usecases/files";
import { formatTitle } from "../../application/usecases/title";
import { updateTab as updateTabState } from "../../application/state/tabState";
import * as cloudApi from "../../infrastructure/supabase/cloudApi";

type FileOpsDeps = {
  stateRef: { current: AppState };
  deps: AppDependencies;
  applyResult: (result: UsecaseResult) => void;
  updateAppState: (updater: (state: AppState) => AppState) => void;
  getActiveTab: () => TabState | null;
  saveFilters: DialogFilter[];
  openFilters: DialogFilter[];
  cloudSessionRef: { current: { user: { id: string; email?: string | null } } | null };
  runCloudAction: (action: () => Promise<void>) => Promise<void>;
  refreshCloudMaps: (sessionOverride?: { user: { id: string } } | null) => Promise<void>;
  isCloudAvailable: () => boolean;
  isOffline: () => boolean;
  setCloudError: (value: string | null) => void;
};

export function useFileOperations({
  stateRef,
  deps,
  applyResult,
  updateAppState,
  getActiveTab,
  saveFilters,
  openFilters,
  cloudSessionRef,
  runCloudAction,
  refreshCloudMaps,
  isCloudAvailable,
  isOffline,
  setCloudError
}: FileOpsDeps) {
  const [isSaveTargetOpen, setIsSaveTargetOpen] = useState(false);
  const [isCloudSaveDialogOpen, setIsCloudSaveDialogOpen] = useState(false);
  const [cloudSaveTitle, setCloudSaveTitle] = useState("");
  const [cloudSaveForceNew, setCloudSaveForceNew] = useState(false);
  const saveTargetResolverRef = useRef<((target: "local" | "cloud" | null) => void) | null>(
    null
  );

  const openMap = useCallback(async () => {
    try {
      const result = await openFromDialogUsecase(stateRef.current, deps, openFilters);
      applyResult(result);
    } catch (e) {
      console.error(e);
    }
  }, [applyResult, deps, openFilters, stateRef]);

  const requestSaveTarget = useCallback((): Promise<"local" | "cloud" | null> => {
    return new Promise((resolve) => {
      saveTargetResolverRef.current = resolve;
      setIsSaveTargetOpen(true);
    });
  }, []);

  const resolveSaveTarget = useCallback((target: "local" | "cloud" | null) => {
    setIsSaveTargetOpen(false);
    const resolver = saveTargetResolverRef.current;
    saveTargetResolverRef.current = null;
    resolver?.(target);
  }, []);

  const saveLocalMap = useCallback(async (tabId: string, saveAs: boolean) => {
    try {
      const result = await saveMapUsecase(stateRef.current, deps, tabId, saveAs, saveFilters);
      applyResult(result);
    } catch (e) {
      console.error("Save failed:", e);
    }
  }, [applyResult, deps, saveFilters, stateRef]);

  const applyCloudSave = useCallback(async (tab: TabState, title: string, cloudId: string) => {
    const tabForTitle: TabState = {
      ...tab,
      title,
      cloudId,
      storageTarget: "cloud",
      filePath: null,
      isDirty: false
    };
    updateAppState((state) =>
      updateTabState(state, tab.id, {
        title,
        cloudId,
        storageTarget: "cloud",
        filePath: null,
        isDirty: false
      })
    );
    await deps.window.setTitle(formatTitle(tabForTitle));
  }, [deps.window, updateAppState]);

  const saveCloud = useCallback(async (tab: TabState, title: string, forceNew: boolean) => {
    const session = cloudSessionRef.current;
    if (!tab.map || !session) return;
    const mapId = forceNew ? null : tab.cloudId;
    await runCloudAction(async () => {
      const saved = await cloudApi.saveMap(mapId, title, tab.map!, session.user.id);
      await applyCloudSave(tab, title, saved.id);
      await refreshCloudMaps(session);
    });
  }, [applyCloudSave, cloudSessionRef, refreshCloudMaps, runCloudAction]);

  const saveCloudMap = useCallback(async (tab: TabState, forceNew: boolean) => {
    await saveCloud(tab, tab.title, forceNew);
  }, [saveCloud]);

  const saveCloudMapWithTitle = useCallback(async (tab: TabState, title: string, forceNew: boolean) => {
    await saveCloud(tab, title, forceNew);
  }, [saveCloud]);

  const openCloudSaveDialog = useCallback(async (forceNew: boolean) => {
    const tab = getActiveTab();
    if (!tab) return;
    if (isOffline()) {
      setCloudError("You're offline. Reconnect to save this map to the cloud.");
    }
    setCloudSaveTitle(tab.title);
    setCloudSaveForceNew(forceNew);
    setIsCloudSaveDialogOpen(true);
  }, [getActiveTab, isOffline, setCloudError]);

  const confirmCloudSave = useCallback(async (title: string) => {
    const tab = getActiveTab();
    if (!tab) return;
    await saveCloudMapWithTitle(tab, title, cloudSaveForceNew);
    setIsCloudSaveDialogOpen(false);
  }, [cloudSaveForceNew, getActiveTab, saveCloudMapWithTitle]);

  const saveWithTarget = useCallback(async (tab: TabState, target: "local" | "cloud", forceNew: boolean) => {
    if (target === "local") {
      await saveLocalMap(tab.id, true);
      return;
    }
    if (!isCloudAvailable()) {
      await saveLocalMap(tab.id, true);
      return;
    }
    await openCloudSaveDialog(forceNew);
  }, [isCloudAvailable, openCloudSaveDialog, saveLocalMap]);

  const saveNewTarget = useCallback(async (tab: TabState) => {
    if (!isCloudAvailable()) {
      await saveLocalMap(tab.id, true);
      return;
    }
    const target = await requestSaveTarget();
    if (!target) return;
    await saveWithTarget(tab, target, true);
  }, [isCloudAvailable, requestSaveTarget, saveLocalMap, saveWithTarget]);

  const saveExistingCloud = useCallback(async (tab: TabState) => {
    if (!isCloudAvailable()) {
      await saveLocalMap(tab.id, true);
      return;
    }
    await saveCloudMap(tab, false);
  }, [isCloudAvailable, saveCloudMap, saveLocalMap]);

  const saveActiveTab = useCallback(async (saveAs: boolean) => {
    const tab = getActiveTab();
    if (!tab) return;
    const needsTarget = saveAs || !tab.storageTarget;
    if (needsTarget) return saveNewTarget(tab);
    if (tab.storageTarget === "cloud") return saveExistingCloud(tab);
    await saveLocalMap(tab.id, false);
  }, [getActiveTab, saveExistingCloud, saveLocalMap, saveNewTarget]);

  const saveToCloud = useCallback(async () => {
    const tab = getActiveTab();
    if (!tab) return;
    const forceNew = tab.storageTarget !== "cloud";
    await openCloudSaveDialog(forceNew);
  }, [getActiveTab, openCloudSaveDialog]);

  return {
    isSaveTargetOpen,
    isCloudSaveDialogOpen,
    cloudSaveTitle,
    setIsCloudSaveDialogOpen,
    openMap,
    saveActiveTab,
    saveToCloud,
    confirmCloudSave,
    resolveSaveTarget
  };
}
