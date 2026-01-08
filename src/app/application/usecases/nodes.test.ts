import { describe, expect, it } from "vitest";
import type { MindMap, Node } from "../../../types";
import type { LayoutConfig, Viewport } from "../../domain/layout/types";
import type { AppState, TabState } from "../state/tabState";
import type { AppDependencies } from "./types";
import { addNode, changeNode, removeSelectedNode, updateIcon } from "./nodes";

function makeNode(id: string, overrides: Partial<Node> = {}): Node {
  return {
    id,
    content: id,
    children: [],
    parent: null,
    x: 0,
    y: 0,
    icons: [],
    ...overrides
  };
}

function makeMap(selectedId = "root"): MindMap {
  const root = makeNode("root");
  return {
    root_id: "root",
    selected_node_id: selectedId,
    nodes: { root }
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

type TestDependencies = AppDependencies & {
  calls: {
    addChild: string[];
    removeNode: string[];
    changeNode: string[];
    addIcon: string[];
    removeLastIcon: string[];
  };
};

function makeDeps(): TestDependencies {
  const calls: TestDependencies["calls"] = {
    addChild: [],
    removeNode: [],
    changeNode: [],
    addIcon: [],
    removeLastIcon: []
  };
  const viewport: Viewport = { width: 800, height: 600 };
  return {
    id: { nextId: () => "tab-1" },
    layout: {
      getLayoutConfig: makeLayoutConfig,
      getViewport: () => viewport
    },
    mindmap: {
      newMap: async () => makeMap(),
      getMap: async () => makeMap(),
      loadMap: async () => makeMap(),
      saveMap: async () => "saved.mm",
      closeTab: async () => undefined,
      addChild: async (tabId) => {
        calls.addChild.push(tabId);
        return makeMap("child");
      },
      addSibling: async () => makeMap("sibling"),
      removeNode: async (tabId, nodeId) => {
        calls.removeNode.push(`${tabId}:${nodeId}`);
        return makeMap("root");
      },
      changeNode: async (tabId, nodeId) => {
        calls.changeNode.push(`${tabId}:${nodeId}`);
        return makeMap("root");
      },
      navigate: async () => "root",
      selectNode: async () => "root",
      addIcon: async (tabId, nodeId, icon) => {
        calls.addIcon.push(`${tabId}:${nodeId}:${icon}`);
        return makeMap("root");
      },
      removeLastIcon: async (tabId, nodeId) => {
        calls.removeLastIcon.push(`${tabId}:${nodeId}`);
        return makeMap("root");
      }
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
    },
    calls
  };
}

describe("node usecases", () => {
  it("adds a child node and marks the tab dirty", async () => {
    const deps = makeDeps();
    const tab: TabState = {
      id: "tab-1",
      title: "Doc",
      filePath: null,
      isDirty: false,
      map: makeMap(),
      offset: { x: 0, y: 0 }
    };
    const state = makeState(tab);

    const result = await addNode(state, deps, tab.id, "child");

    const updated = result.state.tabs[0];
    expect(updated.isDirty).toBe(true);
    expect(updated.map?.selected_node_id).toBe("child");
    expect(deps.calls.addChild).toContain("tab-1");
  });

  it("removes the selected node and marks the tab dirty", async () => {
    const deps = makeDeps();
    const tab: TabState = {
      id: "tab-1",
      title: "Doc",
      filePath: null,
      isDirty: false,
      map: makeMap("to-remove"),
      offset: { x: 0, y: 0 }
    };
    const state = makeState(tab);

    const result = await removeSelectedNode(state, deps, tab.id);

    const updated = result.state.tabs[0];
    expect(updated.isDirty).toBe(true);
    expect(deps.calls.removeNode).toContain("tab-1:to-remove");
  });

  it("updates node content and marks the tab dirty", async () => {
    const deps = makeDeps();
    const tab: TabState = {
      id: "tab-1",
      title: "Doc",
      filePath: null,
      isDirty: false,
      map: makeMap("root"),
      offset: { x: 0, y: 0 }
    };
    const state = makeState(tab);

    const result = await changeNode(state, deps, tab.id, "root", "Updated");

    expect(result.state.tabs[0].isDirty).toBe(true);
    expect(deps.calls.changeNode).toContain("tab-1:root");
  });

  it("updates icons and marks the tab dirty", async () => {
    const deps = makeDeps();
    const tab: TabState = {
      id: "tab-1",
      title: "Doc",
      filePath: null,
      isDirty: false,
      map: makeMap("root"),
      offset: { x: 0, y: 0 }
    };
    const state = makeState(tab);

    const result = await updateIcon(state, deps, tab.id, "trash");

    expect(result.state.tabs[0].isDirty).toBe(true);
    expect(deps.calls.removeLastIcon).toContain("tab-1:root");
  });
});
