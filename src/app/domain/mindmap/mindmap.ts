import type { MindMap, Node } from "../../../types";
import { Navigation } from "../../../types";

type Clock = () => number;

function nowMs(clock?: Clock) {
  return clock ? clock() : Date.now();
}

function generateId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Math.random().toString(36).slice(2, 10)}`;
}

function cloneNode(node: Node): Node {
  return {
    ...node,
    children: [...node.children],
    icons: [...node.icons]
  };
}

function updateNode(map: MindMap, nodeId: string, updater: (node: Node) => Node): MindMap {
  const node = map.nodes[nodeId];
  if (!node) throw new Error("Node not found");
  const updated = updater(cloneNode(node));
  return { ...map, nodes: { ...map.nodes, [nodeId]: updated } };
}

export function createMindMap(clock?: Clock): MindMap {
  const timestamp = nowMs(clock);
  const rootId = generateId();
  const root: Node = {
    id: rootId,
    content: "Central Node",
    children: [],
    parent: null,
    x: 0,
    y: 0,
    created: timestamp,
    modified: timestamp,
    icons: []
  };
  return {
    nodes: { [rootId]: root },
    root_id: rootId,
    selected_node_id: rootId
  };
}

export function addChild(
  map: MindMap,
  parentId: string,
  content: string,
  clock?: Clock
): { map: MindMap; newId: string } {
  const parent = map.nodes[parentId];
  if (!parent) throw new Error("Parent node not found");
  const timestamp = nowMs(clock);
  const newId = generateId();
  const newNode: Node = {
    id: newId,
    content,
    children: [],
    parent: parentId,
    x: 0,
    y: 0,
    created: timestamp,
    modified: timestamp,
    icons: []
  };
  const updatedParent = { ...cloneNode(parent), children: [...parent.children, newId] };
  return {
    map: {
      ...map,
      nodes: {
        ...map.nodes,
        [parentId]: updatedParent,
        [newId]: newNode
      }
    },
    newId
  };
}

export function addSibling(
  map: MindMap,
  nodeId: string,
  content: string,
  clock?: Clock
): { map: MindMap; newId: string } {
  if (nodeId === map.root_id) {
    throw new Error("Cannot add sibling to root");
  }
  const node = map.nodes[nodeId];
  if (!node || !node.parent) throw new Error("Node not found");
  const parent = map.nodes[node.parent];
  if (!parent) throw new Error("Parent node not found");
  const timestamp = nowMs(clock);
  const newId = generateId();
  const newNode: Node = {
    id: newId,
    content,
    children: [],
    parent: node.parent,
    x: 0,
    y: 0,
    created: timestamp,
    modified: timestamp,
    icons: []
  };
  const parentChildren = [...parent.children];
  const index = parentChildren.indexOf(nodeId);
  if (index >= 0) {
    parentChildren.splice(index + 1, 0, newId);
  } else {
    parentChildren.push(newId);
  }
  const updatedParent = { ...cloneNode(parent), children: parentChildren };
  return {
    map: {
      ...map,
      nodes: {
        ...map.nodes,
        [node.parent]: updatedParent,
        [newId]: newNode
      }
    },
    newId
  };
}

export function changeNode(
  map: MindMap,
  nodeId: string,
  content: string,
  clock?: Clock
): MindMap {
  const timestamp = nowMs(clock);
  return updateNode(map, nodeId, (node) => ({
    ...node,
    content,
    modified: timestamp
  }));
}

export function addIcon(map: MindMap, nodeId: string, icon: string, clock?: Clock): MindMap {
  const timestamp = nowMs(clock);
  return updateNode(map, nodeId, (node) => ({
    ...node,
    icons: [...node.icons, icon],
    modified: timestamp
  }));
}

export function removeLastIcon(map: MindMap, nodeId: string, clock?: Clock): MindMap {
  const timestamp = nowMs(clock);
  return updateNode(map, nodeId, (node) => ({
    ...node,
    icons: node.icons.slice(0, -1),
    modified: timestamp
  }));
}

function collectSubtree(map: MindMap, nodeId: string) {
  const toRemove = [nodeId];
  for (let i = 0; i < toRemove.length; i += 1) {
    const current = map.nodes[toRemove[i]];
    if (current) {
      toRemove.push(...current.children);
    }
  }
  return toRemove;
}

export function removeNode(map: MindMap, nodeId: string): MindMap {
  if (nodeId === map.root_id) {
    throw new Error("Cannot remove root node");
  }
  const target = map.nodes[nodeId];
  if (!target || !target.parent) throw new Error("Node not found");
  const parentId = target.parent;
  const parent = map.nodes[parentId];
  if (!parent) throw new Error("Node has no parent");
  const toRemove = new Set(collectSubtree(map, nodeId));
  const nextNodes = { ...map.nodes };
  for (const id of toRemove) {
    delete nextNodes[id];
  }
  const updatedParent = {
    ...cloneNode(parent),
    children: parent.children.filter((childId) => !toRemove.has(childId))
  };
  nextNodes[parentId] = updatedParent;
  const selected = toRemove.has(map.selected_node_id) ? parentId : map.selected_node_id;
  return {
    ...map,
    nodes: nextNodes,
    selected_node_id: selected
  };
}

export function selectNode(map: MindMap, nodeId: string): MindMap {
  if (!map.nodes[nodeId]) throw new Error("Node not found");
  return { ...map, selected_node_id: nodeId };
}

export function navigate(map: MindMap, direction: Navigation): MindMap {
  const current = map.nodes[map.selected_node_id];
  if (!current) return map;
  let nextId: string | null = null;
  if (direction === Navigation.Right) {
    nextId = current.children[0] ?? null;
  } else if (direction === Navigation.Left) {
    nextId = current.parent ?? null;
  } else if (direction === Navigation.Down) {
    if (current.parent) {
      const parent = map.nodes[current.parent];
      if (parent) {
        const index = parent.children.indexOf(current.id);
        if (index >= 0 && index + 1 < parent.children.length) {
          nextId = parent.children[index + 1];
        }
      }
    }
  } else if (direction === Navigation.Up) {
    if (current.parent) {
      const parent = map.nodes[current.parent];
      if (parent) {
        const index = parent.children.indexOf(current.id);
        if (index > 0) {
          nextId = parent.children[index - 1];
        }
      }
    }
  }
  return nextId ? { ...map, selected_node_id: nextId } : map;
}
