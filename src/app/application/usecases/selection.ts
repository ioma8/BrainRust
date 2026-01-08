import type { MindMap } from "../../../types";
import { Navigation } from "../../../types";
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
import { navigate as navigateDomain, selectNode as selectNodeDomain } from "../../domain/mindmap/mindmap";

function updateSelectionMap(tab: TabState, selectedId: string) {
  const updatedMap: MindMap = { ...tab.map!, selected_node_id: selectedId };
  return { ...tab, map: updatedMap };
}

function updateTabOffset(tab: TabState, offset: Point) {
  return { ...tab, offset };
}

function parseNavigation(direction: string): Navigation | null {
  if (direction === "Up") return Navigation.Up;
  if (direction === "Down") return Navigation.Down;
  if (direction === "Left") return Navigation.Left;
  if (direction === "Right") return Navigation.Right;
  return null;
}

export async function selectNode(
  state: AppState,
  deps: AppDependencies,
  tabId: string,
  nodeId: string
): Promise<UsecaseResult> {
  const tab = getTabById(state, tabId);
  if (!tab?.map) return { state };
  const map = selectNodeDomain(tab.map, nodeId);
  const selectedId = map.selected_node_id;
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
  const parsed = parseNavigation(direction);
  if (!parsed) return { state };
  const map = navigateDomain(tab.map, parsed);
  const selectedId = map.selected_node_id;
  const updatedTab = updateSelectionMap(tab, selectedId);
  const visibleOffset = ensureVisibleOffset(updatedTab.map!, deps.layout, tab.offset, selectedId);
  const offsetTab = updateTabOffset(updatedTab, visibleOffset);
  const nextState = updateTab(state, tabId, offsetTab);
  return { state: nextState, render: { map: offsetTab.map!, offset: visibleOffset } };
}
