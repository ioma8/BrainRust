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
    created: 0,
    modified: 0,
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
  calls: {};
};

function makeDeps(): TestDependencies {
  const viewport: Viewport = { width: 800, height: 600 };
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
    },
    calls: {}
  };
}

describe("node usecases", () => {
  it("adds a child node and marks the tab dirty", async () => {
    const deps = makeDeps();
    const tab: TabState = {
      id: "tab-1",
      title: "Doc",
      filePath: null,
      storageTarget: null,
      isDirty: false,
      map: makeMap(),
      offset: { x: 0, y: 0 }
    };
    const state = makeState(tab);

    const result = await addNode(state, deps, tab.id, "child");

    const updated = result.state.tabs[0];
    expect(updated.isDirty).toBe(true);
    expect(updated.map?.selected_node_id).not.toBe("root");
    expect(updated.map?.nodes[updated.map.selected_node_id]).toBeDefined();
  });

  it("removes the selected node and marks the tab dirty", async () => {
    const deps = makeDeps();
    const child = makeNode("child", { parent: "root" });
    const tab: TabState = {
      id: "tab-1",
      title: "Doc",
      filePath: null,
      storageTarget: null,
      isDirty: false,
      map: {
        root_id: "root",
        selected_node_id: "child",
        nodes: {
          root: makeNode("root", { children: ["child"] }),
          child
        }
      },
      offset: { x: 0, y: 0 }
    };
    const state = makeState(tab);

    const result = await removeSelectedNode(state, deps, tab.id);

    const updated = result.state.tabs[0];
    expect(updated.isDirty).toBe(true);
    expect(updated.map?.nodes.child).toBeUndefined();
  });

  it("updates node content and marks the tab dirty", async () => {
    const deps = makeDeps();
    const tab: TabState = {
      id: "tab-1",
      title: "Doc",
      filePath: null,
      storageTarget: null,
      isDirty: false,
      map: makeMap("root"),
      offset: { x: 0, y: 0 }
    };
    const state = makeState(tab);

    const result = await changeNode(state, deps, tab.id, "root", "Updated");

    expect(result.state.tabs[0].isDirty).toBe(true);
    expect(result.state.tabs[0].map?.nodes.root.content).toBe("Updated");
  });

  it("updates icons and marks the tab dirty", async () => {
    const deps = makeDeps();
    const tab: TabState = {
      id: "tab-1",
      title: "Doc",
      filePath: null,
      storageTarget: null,
      isDirty: false,
      map: makeMap("root"),
      offset: { x: 0, y: 0 }
    };
    const state = makeState(tab);

    const result = await updateIcon(state, deps, tab.id, "trash");

    expect(result.state.tabs[0].isDirty).toBe(true);
    expect(result.state.tabs[0].map?.nodes.root.icons).toEqual([]);
  });
});
