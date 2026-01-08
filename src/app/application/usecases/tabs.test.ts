import { describe, expect, it } from "vitest";
import type { MindMap, Node } from "../../../types";
import type { LayoutConfig, Viewport } from "../../domain/layout/types";
import type { AppState, TabState } from "../state/tabState";
import type { AppDependencies } from "./types";
import { closeTab, createNewTab, openMapPath, switchToTab } from "./tabs";

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

function makeMap(): MindMap {
  const root = makeNode("root");
  return {
    root_id: "root",
    selected_node_id: "root",
    nodes: { root }
  };
}

function makeState(tabs: TabState[], activeTabId: string | null): AppState {
  return { tabs, activeTabId };
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
  calls: { titles: string[]; closed: string[]; confirm: string[] };
};

function makeDeps(overrides: Partial<TestDependencies> = {}): TestDependencies {
  const calls: TestDependencies["calls"] = {
    titles: [],
    closed: [],
    confirm: []
  };
  const viewport: Viewport = { width: 800, height: 600 };
  const deps: TestDependencies = {
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
      closeTab: async (tabId) => {
        calls.closed.push(tabId);
      },
      addChild: async () => makeMap(),
      addSibling: async () => makeMap(),
      removeNode: async () => makeMap(),
      changeNode: async () => makeMap(),
      navigate: async () => "root",
      selectNode: async () => "root",
      addIcon: async () => makeMap(),
      removeLastIcon: async () => makeMap()
    },
    dialog: {
      open: async () => null,
      save: async () => null,
      confirm: async (message) => {
        calls.confirm.push(message);
        return true;
      },
      ask: async () => undefined
    },
    window: {
      setTitle: async (title) => {
        calls.titles.push(title);
      },
      close: async () => undefined,
      destroy: async () => undefined
    },
    calls
  };
  return { ...deps, ...overrides } as TestDependencies;
}

describe("tab usecases", () => {
  it("creates a new tab and renders it", async () => {
    const deps = makeDeps();
    const state = makeState([], null);

    const result = await createNewTab(state, deps, "Untitled 1");

    expect(result.state.tabs).toHaveLength(1);
    expect(result.state.activeTabId).toBe("tab-1");
    expect(result.render?.map).toBeTruthy();
    expect(deps.calls.titles).toContain("Untitled 1");
  });

  it("opens a map path in a new tab", async () => {
    const deps = makeDeps();
    const state = makeState([], null);

    const result = await openMapPath(state, deps, "/tmp/example.mm");

    const tab = result.state.tabs[0];
    expect(tab.filePath).toBe("/tmp/example.mm");
    expect(result.state.activeTabId).toBe(tab.id);
    expect(result.render?.map).toBeTruthy();
  });

  it("switches to an existing tab without reloading its map", async () => {
    const deps = makeDeps();
    const tab: TabState = {
      id: "tab-1",
      title: "Loaded",
      filePath: null,
      isDirty: false,
      map: makeMap(),
      offset: { x: 10, y: 20 }
    };
    const state = makeState([tab], null);

    const result = await switchToTab(state, deps, "tab-1", true);

    expect(result.state.activeTabId).toBe("tab-1");
    expect(result.render?.offset).toEqual({ x: 10, y: 20 });
  });

  it("closes a tab when confirmed", async () => {
    const deps = makeDeps();
    const tab: TabState = {
      id: "tab-1",
      title: "Doc",
      filePath: null,
      isDirty: true,
      map: makeMap(),
      offset: { x: 0, y: 0 }
    };
    const state = makeState([tab], "tab-1");

    const result = await closeTab(state, deps, "tab-1");

    expect(result.state.tabs).toHaveLength(1);
    expect(result.state.activeTabId).toBe(result.state.tabs[0].id);
    expect(deps.calls.closed).toContain("tab-1");
  });
});
