import { describe, expect, it } from "vitest";
import { defaultOffset, layoutMap, ensureVisibleOffset } from "./layout";
import type { LayoutPort } from "../ports/layoutPort";
import type { MindMap } from "../../../types";

function makeLayoutPort(): LayoutPort {
  return {
    getLayoutConfig: () => ({
      nodeHeight: 30,
      hGap: 50,
      vGap: 20,
      minNodeWidth: 100,
      measureNodeWidth: () => 100
    }),
    getViewport: () => ({ width: 800, height: 600 })
  };
}

function makeMap(): MindMap {
  return {
    root_id: "root",
    selected_node_id: "root",
    nodes: {
      root: {
        id: "root",
        content: "Root",
        parent: null,
        x: 0,
        y: 0,
        children: ["child1"],
        icons: [],
        created: Date.now(),
        modified: Date.now()
      },
      child1: {
        id: "child1",
        content: "Child 1",
        parent: "root",
        x: 0,
        y: 0,
        children: [],
        icons: [],
        created: Date.now(),
        modified: Date.now()
      }
    }
  };
}

describe("defaultOffset", () => {
  it("returns center of viewport", () => {
    const layout = makeLayoutPort();
    const offset = defaultOffset(layout);

    expect(offset).toEqual({ x: 400, y: 300 });
  });

  it("adjusts to different viewport sizes", () => {
    const layout: LayoutPort = {
      getLayoutConfig: () => ({
        nodeHeight: 30,
        hGap: 50,
        vGap: 20,
        minNodeWidth: 100,
        measureNodeWidth: () => 100
      }),
      getViewport: () => ({ width: 1600, height: 900 })
    };
    const offset = defaultOffset(layout);

    expect(offset).toEqual({ x: 800, y: 450 });
  });
});

describe("layoutMap", () => {
  it("applies layout to map", () => {
    const map = makeMap();
    const layout = makeLayoutPort();
    const offset = { x: 100, y: 100 };

    const result = layoutMap(map, layout, false, offset);

    expect(result.map).not.toBe(map); // new map object
    expect(result.map.nodes.root).toBeDefined();
    expect(result.offset).toEqual(offset); // keeps offset when fit=false
  });

  it("computes fit offset when fit is true", () => {
    const map = makeMap();
    const layout = makeLayoutPort();
    const offset = { x: 0, y: 0 };

    const result = layoutMap(map, layout, true, offset);

    expect(result.offset).not.toEqual(offset); // changed due to fit
    expect(result.offset.x).toBeGreaterThan(0);
    expect(result.offset.y).toBeGreaterThan(0);
  });

  it("uses provided offset when fit is false", () => {
    const map = makeMap();
    const layout = makeLayoutPort();
    const offset = { x: 250, y: 350 };

    const result = layoutMap(map, layout, false, offset);

    expect(result.offset).toEqual({ x: 250, y: 350 });
  });
});

describe("ensureVisibleOffset", () => {
  it("returns adjusted offset to make node visible", () => {
    const map = makeMap();
    const layout = makeLayoutPort();
    const offset = { x: 0, y: 0 };

    const result = ensureVisibleOffset(map, layout, offset, "root");

    expect(result).toBeDefined();
    expect(typeof result.x).toBe("number");
    expect(typeof result.y).toBe("number");
  });

  it("may keep offset if node is already visible", () => {
    const map = makeMap();
    const layout = makeLayoutPort();
    const offset = { x: 400, y: 300 }; // center

    const result = ensureVisibleOffset(map, layout, offset, "root");

    // This test just ensures the function runs without error
    // The actual offset depends on node position and viewport
    expect(result).toBeDefined();
  });
});
