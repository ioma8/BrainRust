import { describe, expect, it } from "vitest";
import type { MindMap, Node } from "../../../types";
import { computeFitOffset, ensureVisible } from "./viewport";
import type { LayoutConfig } from "./types";

const config: LayoutConfig = {
  nodeHeight: 30,
  hGap: 50,
  vGap: 20,
  minNodeWidth: 100,
  measureNodeWidth: () => 100
};

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

describe("computeFitOffset", () => {
  it("centers the bounding box in the viewport", () => {
    const map = makeMap();
    const viewport = { width: 200, height: 100 };
    const offset = computeFitOffset(map, viewport, config);

    expect(offset).toEqual({ x: 50, y: 35 });
  });
});

describe("ensureVisible", () => {
  it("shifts the offset to bring a node into view", () => {
    const map = makeMap();
    map.nodes.root.x = -100;
    const viewport = { width: 200, height: 100 };
    const offset = ensureVisible(map, { x: 0, y: 0 }, "root", viewport, config);

    expect(offset.x).toBe(150);
  });

  it("leaves offset unchanged when node is visible", () => {
    const map = makeMap();
    const viewport = { width: 400, height: 300 };
    const offset = ensureVisible(map, { x: 100, y: 100 }, "root", viewport, config);

    expect(offset).toEqual({ x: 100, y: 100 });
  });
});
