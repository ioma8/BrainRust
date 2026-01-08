import type { MindMap } from "../../../types";
import { addTab, updateTab, type AppState, type TabState } from "../state/tabState";
import { defaultOffset, layoutMap } from "./layout";
import type { AppDependencies } from "./types";
import type { UsecaseResult } from "./result";
import { formatTitle } from "./title";

function createCloudTab(tabId: string, title: string, offset: { x: number; y: number }, cloudId: string) {
  return {
    id: tabId,
    title,
    filePath: null,
    isDirty: false,
    map: null,
    offset,
    cloudId
  };
}

async function applyIcons(
  deps: AppDependencies,
  tabId: string,
  nodeId: string,
  icons: string[]
) {
  for (const icon of icons) {
    await deps.mindmap.addIcon(tabId, nodeId, icon);
  }
}

async function importChildren(
  deps: AppDependencies,
  tabId: string,
  parentId: string,
  map: MindMap,
  nodeId: string
) {
  const node = map.nodes[nodeId];
  for (const childId of node.children) {
    const child = map.nodes[childId];
    const nextMap = await deps.mindmap.addChild(tabId, parentId, child.content);
    const newId = nextMap.selected_node_id;
    await applyIcons(deps, tabId, newId, child.icons);
    await importChildren(deps, tabId, newId, map, childId);
  }
}

async function rebuildMap(deps: AppDependencies, tabId: string, map: MindMap) {
  const fresh = await deps.mindmap.newMap(tabId);
  const root = map.nodes[map.root_id];
  await deps.mindmap.changeNode(tabId, fresh.root_id, root.content);
  await applyIcons(deps, tabId, fresh.root_id, root.icons);
  await importChildren(deps, tabId, fresh.root_id, map, map.root_id);
  await deps.mindmap.selectNode(tabId, fresh.root_id);
}

export async function openCloudMap(
  state: AppState,
  deps: AppDependencies,
  title: string,
  map: MindMap,
  cloudId: string
): Promise<UsecaseResult> {
  const tabId = deps.id.nextId();
  const baseOffset = defaultOffset(deps.layout);
  const tab = createCloudTab(tabId, title, baseOffset, cloudId);
  let nextState = addTab(state, tab, true);
  await rebuildMap(deps, tabId, map);
  const loaded = await deps.mindmap.getMap(tabId);
  const { map: laidOutMap, offset } = layoutMap(loaded, deps.layout, true, baseOffset);
  const updatedTab: TabState = { ...tab, map: laidOutMap, offset };
  nextState = updateTab(nextState, tabId, updatedTab);
  await deps.window.setTitle(formatTitle(updatedTab));
  return { state: nextState, render: { map: laidOutMap, offset } };
}
