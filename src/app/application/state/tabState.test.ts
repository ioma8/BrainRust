import { describe, expect, it } from "vitest";
import type { AppState, TabState } from "./tabState";
import {
  addTab,
  closeTab,
  markTabDirty,
  setActiveTab,
  updateTab
} from "./tabState";

function makeTab(id: string, title = "Untitled"): TabState {
  return {
    id,
    title,
    filePath: null,
    isDirty: false,
    map: null,
    offset: { x: 0, y: 0 }
  };
}

function makeState(tabs: TabState[], activeTabId: string | null): AppState {
  return { tabs, activeTabId };
}

describe("tab state", () => {
  it("adds a tab and can set it active", () => {
    const state = makeState([], null);
    const tab = makeTab("1");
    const next = addTab(state, tab, true);

    expect(next.tabs).toHaveLength(1);
    expect(next.activeTabId).toBe("1");
  });

  it("closes the active tab and selects the next tab", () => {
    const tabs = [makeTab("1"), makeTab("2"), makeTab("3")];
    const state = makeState(tabs, "2");
    const result = closeTab(state, "2");

    expect(result.state.tabs.map((tab) => tab.id)).toEqual(["1", "3"]);
    expect(result.state.activeTabId).toBe("3");
  });

  it("closes the active tab and selects the previous tab when needed", () => {
    const tabs = [makeTab("1"), makeTab("2")];
    const state = makeState(tabs, "2");
    const result = closeTab(state, "2");

    expect(result.state.tabs.map((tab) => tab.id)).toEqual(["1"]);
    expect(result.state.activeTabId).toBe("1");
  });

  it("keeps the active tab when closing a different tab", () => {
    const tabs = [makeTab("1"), makeTab("2"), makeTab("3")];
    const state = makeState(tabs, "2");
    const result = closeTab(state, "1");

    expect(result.state.activeTabId).toBe("2");
  });

  it("updates a tab by id", () => {
    const tabs = [makeTab("1"), makeTab("2")];
    const state = makeState(tabs, "1");
    const next = updateTab(state, "2", { title: "Updated" });

    expect(next.tabs[1].title).toBe("Updated");
  });

  it("marks a tab dirty", () => {
    const tabs = [makeTab("1")];
    const state = makeState(tabs, "1");
    const next = markTabDirty(state, "1");

    expect(next.tabs[0].isDirty).toBe(true);
  });

  it("sets the active tab", () => {
    const tabs = [makeTab("1"), makeTab("2")];
    const state = makeState(tabs, "1");
    const next = setActiveTab(state, "2");

    expect(next.activeTabId).toBe("2");
  });
});
