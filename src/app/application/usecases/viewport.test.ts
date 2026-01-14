import { describe, expect, it } from "vitest";
import { setTabOffset } from "./viewport";
import type { AppState } from "../state/tabState";

function makeState(): AppState {
  return {
    tabs: [
      {
        id: "tab-1",
        title: "Map 1",
        filePath: null,
        storageTarget: null,
        isDirty: false,
        map: null,
        offset: { x: 100, y: 100 },
        cloudId: null
      }
    ],
    activeTabId: "tab-1"
  };
}

describe("setTabOffset", () => {
  it("updates the offset of the specified tab", () => {
    const state = makeState();
    const newOffset = { x: 200, y: 300 };

    const result = setTabOffset(state, "tab-1", newOffset);

    expect(result.tabs[0].offset).toEqual(newOffset);
  });

  it("does not modify other tab properties", () => {
    const state = makeState();
    const originalTab = state.tabs[0];

    const result = setTabOffset(state, "tab-1", { x: 200, y: 300 });

    expect(result.tabs[0].id).toBe(originalTab.id);
    expect(result.tabs[0].title).toBe(originalTab.title);
    expect(result.tabs[0].isDirty).toBe(originalTab.isDirty);
  });

  it("returns a new state object", () => {
    const state = makeState();

    const result = setTabOffset(state, "tab-1", { x: 200, y: 300 });

    expect(result).not.toBe(state);
  });

  it("handles non-existent tab gracefully", () => {
    const state = makeState();

    const result = setTabOffset(state, "non-existent", { x: 200, y: 300 });

    // Should not throw and should return state with no changes to existing tabs
    expect(result.tabs[0].offset).toEqual({ x: 100, y: 100 });
  });
});
