/**
 * @vitest-environment jsdom
 */
import { act } from "preact/test-utils";
import { describe, expect, it, vi } from "vitest";
import { renderHook } from "./hookTestUtils";
import { useMapOperations } from "../useMapOperations";
import { addChild, createMindMap } from "../../../domain/mindmap/mindmap";
import type { AppState, TabState } from "../../../application/state/tabState";
import type { AppDependencies } from "../../../application/usecases/types";

function makeDeps(): AppDependencies {
  return {
    id: { nextId: () => "tab-1" },
    layout: {
      getLayoutConfig: () => ({
        nodeHeight: 30,
        hGap: 50,
        vGap: 20,
        minNodeWidth: 100,
        measureNodeWidth: () => 100
      }),
      getViewport: () => ({ width: 800, height: 600 })
    },
    mapFile: {
      loadMap: async () => createMindMap(),
      saveMap: async (path) => path
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

describe("useMapOperations", () => {
  it("selects a node and applies result", async () => {
    const deps = makeDeps();
    const applyResult = vi.fn();
    const map = createMindMap(() => 0);
    const { map: withChild, newId } = addChild(map, map.root_id, "Child", () => 0);
    const tab: TabState = {
      id: "tab-1",
      title: "Doc",
      filePath: null,
      storageTarget: null,
      isDirty: false,
      map: withChild,
      offset: { x: 0, y: 0 },
      cloudId: null
    };
    const stateRef = { current: { tabs: [tab], activeTabId: tab.id } as AppState };
    const { result } = renderHook(() =>
      useMapOperations({
        stateRef,
        deps,
        applyResult,
        getActiveTab: () => tab
      })
    );

    await act(async () => {
      await result.selectNode(newId);
    });

    const call = applyResult.mock.calls[0]?.[0];
    expect(call?.state.tabs[0].map?.selected_node_id).toBe(newId);
  });
});
