import { expect, test } from "vitest";
import type { MindMap } from "../../../types";
import { buildRenderPlan } from "./renderPlan";

const map: MindMap = {
  root_id: "root",
  selected_node_id: "child",
  nodes: {
    root: {
      id: "root",
      content: "Root",
      children: ["child"],
      parent: null,
      x: 0,
      y: 0,
      created: 0,
      modified: 0,
      icons: []
    },
    child: {
      id: "child",
      content: "Child",
      children: [],
      parent: "root",
      x: 120,
      y: 40,
      created: 0,
      modified: 0,
      icons: []
    }
  }
};

test("builds nodes and edges with offsets", () => {
  const plan = buildRenderPlan(
    map,
    { x: 10, y: 20 },
    { nodeHeight: 30, getNodeWidth: (node) => (node.id === "root" ? 100 : 80) }
  );

  const child = plan.nodes.find((node) => node.id === "child");
  expect(child?.x).toBe(130);
  expect(child?.y).toBe(60);
  expect(child?.width).toBe(80);

  expect(plan.edges).toHaveLength(1);
  const edge = plan.edges[0];
  expect(edge.start).toEqual({ x: 110, y: 35 });
  expect(edge.end).toEqual({ x: 130, y: 75 });
});

test("supports overriding selection", () => {
  const plan = buildRenderPlan(
    map,
    { x: 0, y: 0 },
    { nodeHeight: 30, getNodeWidth: () => 100 },
    null
  );
  expect(plan.nodes.every((node) => !node.isSelected)).toBe(true);
});
