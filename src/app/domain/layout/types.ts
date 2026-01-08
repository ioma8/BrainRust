import type { Node } from "../../../types";

export type MeasureNodeWidth = (node: Node) => number;

export type LayoutConfig = {
  nodeHeight: number;
  hGap: number;
  vGap: number;
  minNodeWidth: number;
  measureNodeWidth: MeasureNodeWidth;
};

export type Point = { x: number; y: number };

export type Viewport = { width: number; height: number };
