import { describe, expect, it } from "vitest";
import type { MindMap, Node } from "../../../types";
import type { LayoutConfig, Viewport } from "../../domain/layout/types";
import type { AppState, TabState } from "../state/tabState";
import type { AppDependencies } from "./types";
import { navigateSelection, selectNode } from "./selection";

function makeNode(id: string, overrides: Partial<Node> = {}): Node {
  return {
    id,
    content: id,
    children: [],
    parent: null,
    x: 0,
    y: 0,
    icons: [],
    created: 0,
    modified: 0,
    ...overrides
  };
}

function makeMap(selectedId = "root"): MindMap {
  const root = makeNode("root", { children: ["other"] });
  const other = makeNode("other", { x: 200, y: 0, parent: "root" });
  return {
    root_id: "root",
    selected_node_id: selectedId,
    nodes: { root, other }
  };
}

function makeState(tab: TabState): AppState {
  return { tabs: [tab], activeTabId: tab.id };
}

function makeLayoutConfig(): LayoutConfig {
  return {
    nodeHeight: 30,
    hGap: 50,
    vGap: 20,
    minNodeWidth: 100,
    measureNodeWidth: () => 100
  };
}

function makeDeps(): AppDependencies {
  const viewport: Viewport = { width: 300, height: 200 };
  return {
    id: { nextId: () => "tab-1" },
    layout: {
      getLayoutConfig: makeLayoutConfig,
      getViewport: () => viewport
    },
    mapFile: {
      loadMap: async () => makeMap(),
      saveMap: async () => "saved.mm"
    },
    dialog: {
      open: async () => null,
      save: async () => null,
      confirm: async () => true,
      ask: async () => undefined
    },
    window: {
      setTitle: async () => undefined,
      close: async () => undefined,
      destroy: async () => undefined
    }
  };
}

describe("selection usecases", () => {
  it("selects a node and updates the selection", async () => {
    const deps = makeDeps();
    const tab: TabState = {
      id: "tab-1",
      title: "Doc",
      filePath: null,
      storageTarget: null,
      isDirty: false,
      map: makeMap(),
      offset: { x: 0, y: 0 },
      cloudId: null
    };
    const state = makeState(tab);

    const result = await selectNode(state, deps, tab.id, "other");

    expect(result.state.tabs[0].map?.selected_node_id).toBe("other");
    expect(result.render?.map.selected_node_id).toBe("other");
  });

  it("navigates and updates selection", async () => {
    const deps = makeDeps();
    const tab: TabState = {
      id: "tab-1",
      title: "Doc",
      filePath: null,
      storageTarget: null,
      isDirty: false,
      map: makeMap(),
      offset: { x: 0, y: 0 },
      cloudId: null
    };
    const state = makeState(tab);

    const result = await navigateSelection(state, deps, tab.id, "Right");

    expect(result.state.tabs[0].map?.selected_node_id).toBe("other");
  });
});
