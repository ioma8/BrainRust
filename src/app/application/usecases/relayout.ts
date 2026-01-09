import { getTabById, updateTab, type AppState } from "../state/tabState";
import type { AppDependencies } from "./types";
import type { UsecaseResult } from "./result";
import { ensureVisibleOffset, layoutMap } from "./layout";

function relayoutTab(state: AppState, deps: AppDependencies, tabId: string): AppState {
  const tab = getTabById(state, tabId);
  if (!tab?.map) return state;
  const { map: laidOutMap, offset } = layoutMap(tab.map, deps.layout, false, tab.offset);
  const visibleOffset = ensureVisibleOffset(
    laidOutMap,
    deps.layout,
    offset,
    laidOutMap.selected_node_id
  );
  return updateTab(state, tabId, { map: laidOutMap, offset: visibleOffset });
}

export function relayoutAllTabs(state: AppState, deps: AppDependencies): UsecaseResult {
  let nextState = state;
  state.tabs.forEach((tab) => {
    if (!tab.map) return;
    nextState = relayoutTab(nextState, deps, tab.id);
  });
  const active = nextState.activeTabId ? getTabById(nextState, nextState.activeTabId) : null;
  if (active?.map) {
    return { state: nextState, render: { map: active.map, offset: active.offset } };
  }
  return { state: nextState };
}

