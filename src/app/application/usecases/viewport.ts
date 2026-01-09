import type { AppState } from "../state/tabState";
import { updateTab } from "../state/tabState";
import type { Point } from "../../domain/layout/types";

/**
 * Updates the viewport offset for a specific tab.
 * This is used during canvas panning/dragging.
 */
export function setTabOffset(state: AppState, tabId: string, offset: Point): AppState {
  return updateTab(state, tabId, { offset });
}
