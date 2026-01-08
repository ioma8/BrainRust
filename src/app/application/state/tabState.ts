import type { MindMap } from "../../../types";
import type { Point } from "../../domain/layout/types";

export type TabState = {
  id: string;
  title: string;
  filePath: string | null;
  isDirty: boolean;
  map: MindMap | null;
  offset: Point;
  cloudId: string | null;
};

export type AppState = {
  tabs: TabState[];
  activeTabId: string | null;
};

export function addTab(state: AppState, tab: TabState, setActive = false): AppState {
  return {
    tabs: [...state.tabs, tab],
    activeTabId: setActive ? tab.id : state.activeTabId
  };
}

export function setActiveTab(state: AppState, tabId: string): AppState {
  return { ...state, activeTabId: tabId };
}

export function updateTab(
  state: AppState,
  tabId: string,
  patch: Partial<TabState>
): AppState {
  const tabs = state.tabs.map((tab) =>
    tab.id === tabId ? { ...tab, ...patch } : tab
  );
  return { ...state, tabs };
}

export function markTabDirty(
  state: AppState,
  tabId: string,
  isDirty = true
): AppState {
  return updateTab(state, tabId, { isDirty });
}

export function closeTab(
  state: AppState,
  tabId: string
): { state: AppState; closed?: TabState; nextActiveTabId: string | null } {
  const index = state.tabs.findIndex((tab) => tab.id === tabId);
  if (index === -1) return { state, nextActiveTabId: state.activeTabId };
  const closed = state.tabs[index];
  const tabs = state.tabs.filter((tab) => tab.id !== tabId);
  let activeTabId = state.activeTabId;
  if (tabId === state.activeTabId) {
    const next = tabs[index] ?? tabs[index - 1] ?? null;
    activeTabId = next ? next.id : null;
  }
  return { state: { tabs, activeTabId }, closed, nextActiveTabId: activeTabId };
}

export function getActiveTab(state: AppState): TabState | null {
  if (!state.activeTabId) return null;
  return state.tabs.find((tab) => tab.id === state.activeTabId) || null;
}

export function getTabById(state: AppState, tabId: string): TabState | null {
  return state.tabs.find((tab) => tab.id === tabId) || null;
}
