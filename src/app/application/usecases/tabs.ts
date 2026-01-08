import type { Point } from "../../domain/layout/types";
import {
  addTab,
  closeTab as closeTabState,
  getTabById,
  setActiveTab,
  updateTab,
  type AppState,
  type TabState
} from "../state/tabState";
import type { AppDependencies } from "./types";
import { defaultOffset, layoutMap } from "./layout";
import type { UsecaseResult } from "./result";
import { formatTitle } from "./title";
import { createMindMap } from "../../domain/mindmap/mindmap";

function buildTab(
  tabId: string,
  title: string,
  filePath: string | null,
  offset: Point,
  storageTarget: "local" | "cloud" | null
): TabState {
  return {
    id: tabId,
    title,
    filePath,
    storageTarget,
    isDirty: false,
    map: null,
    offset,
    cloudId: null
  };
}

function updateWindowTitle(deps: AppDependencies, tab?: TabState | null) {
  return deps.window.setTitle(formatTitle(tab));
}

async function confirmTabClose(tab: TabState, deps: AppDependencies) {
  if (!tab.isDirty) return true;
  return deps.dialog.confirm("You have unsaved changes. Close this tab?", {
    kind: "warning",
    title: "Unsaved Changes"
  });
}

export async function createNewTab(
  state: AppState,
  deps: AppDependencies,
  title: string
): Promise<UsecaseResult> {
  const tabId = deps.id.nextId();
  const baseOffset = defaultOffset(deps.layout);
  const tab = buildTab(tabId, title, null, baseOffset, null);
  let nextState = addTab(state, tab, true);
  const map = createMindMap();
  const { map: laidOutMap, offset } = layoutMap(map, deps.layout, true, baseOffset);
  const updatedTab = { ...tab, map: laidOutMap, offset };
  nextState = updateTab(nextState, tabId, updatedTab);
  await updateWindowTitle(deps, updatedTab);
  return { state: nextState, render: { map: laidOutMap, offset } };
}

export async function switchToTab(
  state: AppState,
  deps: AppDependencies,
  tabId: string,
  fit: boolean
): Promise<UsecaseResult> {
  const tab = getTabById(state, tabId);
  if (!tab) return { state };
  let nextState = setActiveTab(state, tabId);
  if (!tab.map) return { state: nextState };
  await updateWindowTitle(deps, tab);
  return { state: nextState, render: { map: tab.map, offset: tab.offset } };
}

export async function openMapPath(
  state: AppState,
  deps: AppDependencies,
  path: string
): Promise<UsecaseResult> {
  const existing = state.tabs.find((tab) => tab.filePath === path);
  if (existing) return switchToTab(state, deps, existing.id, true);
  const tabId = deps.id.nextId();
  const baseOffset = defaultOffset(deps.layout);
  const title = path.split(/[\\/]/).pop() || path;
  const tab = buildTab(tabId, title, path, baseOffset, "local");
  let nextState = addTab(state, tab, true);
  const map = await deps.mapFile.loadMap(path);
  const { map: laidOutMap, offset } = layoutMap(map, deps.layout, true, baseOffset);
  const updatedTab = { ...tab, map: laidOutMap, offset };
  nextState = updateTab(nextState, tabId, updatedTab);
  await updateWindowTitle(deps, updatedTab);
  return { state: nextState, render: { map: laidOutMap, offset } };
}

export async function closeTab(
  state: AppState,
  deps: AppDependencies,
  tabId: string,
  fallbackTitle = "Untitled"
): Promise<UsecaseResult> {
  const tab = getTabById(state, tabId);
  if (!tab) return { state };
  const confirmed = await confirmTabClose(tab, deps);
  if (!confirmed) return { state };
  const { state: nextState } = closeTabState(state, tabId);
  if (nextState.tabs.length === 0) {
    return createNewTab(nextState, deps, fallbackTitle);
  }
  if (state.activeTabId === tabId && nextState.activeTabId) {
    return switchToTab(nextState, deps, nextState.activeTabId, true);
  }
  await updateWindowTitle(deps, getTabById(nextState, nextState.activeTabId || ""));
  return { state: nextState };
}
