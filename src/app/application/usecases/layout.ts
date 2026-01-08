import type { MindMap } from "../../../types";
import { computeLayout } from "../../domain/layout/layout";
import { computeFitOffset, ensureVisible } from "../../domain/layout/viewport";
import type { Point } from "../../domain/layout/types";
import type { LayoutPort } from "../ports/layoutPort";

export function defaultOffset(layout: LayoutPort): Point {
  const viewport = layout.getViewport();
  return { x: viewport.width / 2, y: viewport.height / 2 };
}

export function layoutMap(
  map: MindMap,
  layout: LayoutPort,
  fit: boolean,
  offset: Point
) {
  const config = layout.getLayoutConfig();
  const laidOutMap = computeLayout(map, config);
  const viewport = layout.getViewport();
  const nextOffset = fit ? computeFitOffset(laidOutMap, viewport, config) : offset;
  return { map: laidOutMap, offset: nextOffset };
}

export function ensureVisibleOffset(
  map: MindMap,
  layout: LayoutPort,
  offset: Point,
  nodeId: string
) {
  const viewport = layout.getViewport();
  const config = layout.getLayoutConfig();
  return ensureVisible(map, offset, nodeId, viewport, config);
}
