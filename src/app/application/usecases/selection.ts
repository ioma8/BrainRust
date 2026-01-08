import type { MindMap } from "../../../types";
import type { Point } from "../../domain/layout/types";
import { ensureVisibleOffset } from "./layout";
import {
  getTabById,
  updateTab,
  type AppState,
  type TabState
} from "../state/tabState";
import type { AppDependencies } from "./types";
import type { UsecaseResult } from "./result";

function updateSelectionMap(tab: TabState, selectedId: string) {
  const updatedMap: MindMap = { ...tab.map!, selected_node_id: selectedId };
  return { ...tab, map: updatedMap };
}

function updateTabOffset(tab: TabState, offset: Point) {
  return { ...tab, offset };
}

export async function selectNode(
  state: AppState,
  deps: AppDependencies,
  tabId: string,
  nodeId: string
): Promise<UsecaseResult> {
  const tab = getTabById(state, tabId);
  if (!tab?.map) return { state };
  const selectedId = await deps.mindmap.selectNode(tabId, nodeId);
  const updatedTab = updateSelectionMap(tab, selectedId);
  const visibleOffset = ensureVisibleOffset(updatedTab.map!, deps.layout, tab.offset, selectedId);
  const offsetTab = updateTabOffset(updatedTab, visibleOffset);
  const nextState = updateTab(state, tabId, offsetTab);
  return { state: nextState, render: { map: offsetTab.map!, offset: visibleOffset } };
}

export async function navigateSelection(
  state: AppState,
  deps: AppDependencies,
  tabId: string,
  direction: string
): Promise<UsecaseResult> {
  const tab = getTabById(state, tabId);
  if (!tab?.map) return { state };
  const selectedId = await deps.mindmap.navigate(tabId, direction);
  const updatedTab = updateSelectionMap(tab, selectedId);
  const visibleOffset = ensureVisibleOffset(updatedTab.map!, deps.layout, tab.offset, selectedId);
  const offsetTab = updateTabOffset(updatedTab, visibleOffset);
  const nextState = updateTab(state, tabId, offsetTab);
  return { state: nextState, render: { map: offsetTab.map!, offset: visibleOffset } };
}
