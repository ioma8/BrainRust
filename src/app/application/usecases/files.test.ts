import { describe, expect, it } from "vitest";
import type { MindMap, Node } from "../../../types";
import type { LayoutConfig, Viewport } from "../../domain/layout/types";
import type { AppState, TabState } from "../state/tabState";
import type { AppDependencies } from "./types";
import { openFromDialog, saveMap } from "./files";

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
  calls: { saved: string[]; titles: string[]; opened: string[] };
};

function makeDeps(overrides: Partial<TestDependencies> = {}): TestDependencies {
  const calls: { saved: string[]; titles: string[]; opened: string[] } = {
    saved: [],
    titles: [],
    opened: []
  };
  const viewport: Viewport = { width: 800, height: 600 };
  const deps: TestDependencies = {
    id: { nextId: () => "tab-1" },
    layout: {
      getLayoutConfig: makeLayoutConfig,
      getViewport: () => viewport
    },
    mapFile: {
      loadMap: async (path) => {
        calls.opened.push(path);
        return makeMap();
      },
      saveMap: async (path) => {
        calls.saved.push(path);
        return path;
      }
    },
    dialog: {
      open: async () => null,
      save: async () => null,
      confirm: async () => true,
      ask: async () => undefined
    },
    window: {
      setTitle: async (title) => {
        calls.titles.push(title);
      },
      close: async () => undefined,
      destroy: async () => undefined
    },
    calls,
    ...overrides
  };
  return deps;
}

describe("file usecases", () => {
  it("saves to existing path without prompting", async () => {
    const deps = makeDeps();
    const tab: TabState = {
      id: "tab-1",
      title: "Doc",
      filePath: "/tmp/doc.mm",
      storageTarget: "local",
      isDirty: true,
      map: makeMap(),
      offset: { x: 0, y: 0 },
      cloudId: null
    };
    const state = makeState(tab);

    const result = await saveMap(state, deps, tab.id, false, []);

    expect(result.state.tabs[0].isDirty).toBe(false);
    expect(deps.calls.saved).toContain("/tmp/doc.mm");
  });

  it("prompts for path when saving new file", async () => {
    const deps = makeDeps({
      dialog: {
        open: async () => null,
        save: async () => "/tmp/new.mm",
        confirm: async () => true,
        ask: async () => undefined
      }
    });
    const tab: TabState = {
      id: "tab-1",
      title: "Doc",
      filePath: null,
      storageTarget: null,
      isDirty: true,
      map: makeMap(),
      offset: { x: 0, y: 0 },
      cloudId: null
    };
    const state = makeState(tab);

    const result = await saveMap(state, deps, tab.id, true, []);

    expect(result.state.tabs[0].filePath).toBe("/tmp/new.mm");
    expect(deps.calls.saved).toContain("/tmp/new.mm");
  });

  it("opens a map from dialog selection", async () => {
    const deps = makeDeps({
      dialog: {
        open: async () => "/tmp/example.mm",
        save: async () => null,
        confirm: async () => true,
        ask: async () => undefined
      }
    });
    const state: AppState = { tabs: [], activeTabId: null };

    const result = await openFromDialog(state, deps, []);

    expect(result.state.tabs).toHaveLength(1);
    expect(deps.calls.opened).toContain("/tmp/example.mm");
  });
});
