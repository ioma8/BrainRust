import { describe, expect, it } from "vitest";
import type { MindMap } from "../../../types";
import { Navigation } from "../../../types";
import {
  addChild,
  addIcon,
  addSibling,
  changeNode,
  createMindMap,
  navigate,
  removeLastIcon,
  removeNode,
  selectNode
} from "./mindmap";

function getNode(map: MindMap, id: string) {
  const node = map.nodes[id];
  if (!node) throw new Error("Missing node");
  return node;
}

describe("mindmap domain", () => {
  it("creates a new map with a central node", () => {
    const now = () => 123;
    const map = createMindMap(now);

    expect(map.root_id).toBe(map.selected_node_id);
    const root = getNode(map, map.root_id);
    expect(root.content).toBe("Central Node");
    expect(root.children).toEqual([]);
    expect(root.parent).toBeNull();
    expect(root.created).toBe(123);
    expect(root.modified).toBe(123);
  });

  it("adds a child and updates the parent", () => {
    const now = () => 200;
    let map = createMindMap(now);
    const rootId = map.root_id;

    const result = addChild(map, rootId, "Child", now);
    map = result.map;

    const child = getNode(map, result.newId);
    expect(child.parent).toBe(rootId);
    expect(child.content).toBe("Child");
    expect(child.created).toBe(200);

    const root = getNode(map, rootId);
    expect(root.children).toContain(result.newId);
  });

  it("changes node content and updates modified time", () => {
    const now1 = () => 10;
    const now2 = () => 99;
    let map = createMindMap(now1);
    const rootId = map.root_id;

    map = changeNode(map, rootId, "Updated", now2);

    const root = getNode(map, rootId);
    expect(root.content).toBe("Updated");
    expect(root.created).toBe(10);
    expect(root.modified).toBe(99);
  });

  it("removes a node and its subtree", () => {
    const now = () => 5;
    let map = createMindMap(now);
    const rootId = map.root_id;

    const child = addChild(map, rootId, "Child", now);
    map = child.map;
    const grandChild = addChild(map, child.newId, "Grand", now);
    map = grandChild.map;

    map = selectNode(map, grandChild.newId);
    map = removeNode(map, child.newId);

    expect(map.nodes[child.newId]).toBeUndefined();
    expect(map.nodes[grandChild.newId]).toBeUndefined();
    expect(map.selected_node_id).toBe(rootId);
  });

  it("adds a sibling after the node", () => {
    const now = () => 1;
    let map = createMindMap(now);
    const rootId = map.root_id;
    const child1 = addChild(map, rootId, "C1", now);
    map = child1.map;
    const child2 = addSibling(map, child1.newId, "C2", now);
    map = child2.map;

    const root = getNode(map, rootId);
    expect(root.children).toEqual([child1.newId, child2.newId]);
  });

  it("prevents adding a sibling to the root", () => {
    const now = () => 1;
    const map = createMindMap(now);

    expect(() => addSibling(map, map.root_id, "Nope", now)).toThrow("Cannot add sibling to root");
  });

  it("navigates between nodes", () => {
    const now = () => 1;
    let map = createMindMap(now);
    const rootId = map.root_id;
    const child1 = addChild(map, rootId, "C1", now);
    map = child1.map;
    const child2 = addChild(map, rootId, "C2", now);
    map = child2.map;

    map = navigate(map, Navigation.Right);
    expect(map.selected_node_id).toBe(child1.newId);

    map = navigate(map, Navigation.Down);
    expect(map.selected_node_id).toBe(child2.newId);

    map = navigate(map, Navigation.Up);
    expect(map.selected_node_id).toBe(child1.newId);

    map = navigate(map, Navigation.Left);
    expect(map.selected_node_id).toBe(rootId);
  });

  it("adds and removes icons", () => {
    const now = () => 5;
    let map = createMindMap(now);
    const rootId = map.root_id;

    map = addIcon(map, rootId, "idea", now);
    map = addIcon(map, rootId, "help", now);

    const root = getNode(map, rootId);
    expect(root.icons).toEqual(["idea", "help"]);

    map = removeLastIcon(map, rootId, now);
    expect(map.nodes[rootId].icons).toEqual(["idea"]);
  });
});
