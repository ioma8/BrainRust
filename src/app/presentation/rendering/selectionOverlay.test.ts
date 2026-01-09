import { expect, test } from "vitest";
import type { MindMap } from "../../../types";
import { buildSelectedNodeOverlay } from "./selectionOverlay";

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
      icons: ["idea"]
    }
  }
};

test("builds overlay for selected node", () => {
  const node = buildSelectedNodeOverlay(map, { x: 10, y: 20 }, {
    nodeHeight: 30,
    getNodeWidth: () => 80
  });
  expect(node).toEqual({
    id: "child",
    content: "Child",
    icons: ["idea"],
    x: 130,
    y: 60,
    width: 80,
    height: 30,
    isSelected: true
  });
});

test("returns null when selection is missing", () => {
  const missingSelection = {
    ...map,
    selected_node_id: "nope"
  };
  const node = buildSelectedNodeOverlay(missingSelection, { x: 0, y: 0 }, {
    nodeHeight: 30,
    getNodeWidth: () => 80
  });
  expect(node).toBeNull();
});
