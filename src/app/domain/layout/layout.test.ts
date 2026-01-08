import { describe, expect, it } from "vitest";
import type { MindMap, Node } from "../../../types";
import { computeLayout } from "./layout";
import type { LayoutConfig } from "./types";

const config: LayoutConfig = {
  nodeHeight: 30,
  hGap: 50,
  vGap: 20,
  minNodeWidth: 100,
  measureNodeWidth: () => 80
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
  const root = makeNode("root", { children: ["c1", "c2"] });
  const c1 = makeNode("c1", { parent: "root" });
  const c2 = makeNode("c2", { parent: "root" });
  return {
    root_id: "root",
    selected_node_id: "root",
    nodes: { root, c1, c2 }
  };
}

describe("computeLayout", () => {
  it("positions children to the right and stacks vertically", () => {
    const map = makeMap();
    const next = computeLayout(map, config);
    const root = next.nodes.root;
    const c1 = next.nodes.c1;
    const c2 = next.nodes.c2;

    expect(root.x).toBe(0);
    expect(root.y).toBe(0);
    expect(c1.x).toBe(150);
    expect(c1.y).toBe(-25);
    expect(c2.x).toBe(150);
    expect(c2.y).toBe(25);
  });

  it("keeps the root anchored when it already has a position", () => {
    const map = makeMap();
    map.nodes.root.x = 200;
    map.nodes.root.y = 120;

    const next = computeLayout(map, config);

    expect(next.nodes.root.x).toBe(200);
    expect(next.nodes.root.y).toBe(120);
  });

  it("does not mutate the input map", () => {
    const map = makeMap();
    const originalX = map.nodes.c1.x;
    computeLayout(map, config);
    expect(map.nodes.c1.x).toBe(originalX);
  });
});
