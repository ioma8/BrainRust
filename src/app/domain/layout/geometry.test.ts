import { describe, expect, it } from "vitest";
import type { MindMap, Node } from "../../../types";
import { getNodeAt, screenToWorld } from "./geometry";
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
    created: 0,
    modified: 0,
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

describe("screenToWorld", () => {
  it("converts a screen point using the offset", () => {
    const world = screenToWorld({ x: 150, y: 80 }, { x: 50, y: 30 });
    expect(world).toEqual({ x: 100, y: 50 });
  });
});

describe("getNodeAt", () => {
  it("returns the node when point hits it", () => {
    const map = makeMap();
    const hit = getNodeAt(map, { x: 0, y: 0 }, { x: 10, y: 10 }, config);
    expect(hit?.id).toBe("root");
  });

  it("returns null when point misses", () => {
    const map = makeMap();
    const hit = getNodeAt(map, { x: 0, y: 0 }, { x: 200, y: 200 }, config);
    expect(hit).toBeNull();
  });
});
