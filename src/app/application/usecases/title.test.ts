import { describe, expect, it } from "vitest";
import { formatTitle } from "./title";
import type { TabState } from "../state/tabState";

function makeTab(overrides: Partial<TabState> = {}): TabState {
  return {
    id: "tab-1",
    title: "My Map",
    filePath: null,
    storageTarget: null,
    isDirty: false,
    map: null,
    offset: { x: 0, y: 0 },
    cloudId: null,
    ...overrides
  };
}

describe("formatTitle", () => {
  it("returns default title when tab is null", () => {
    expect(formatTitle(null)).toBe("BrainRust");
  });

  it("returns default title when tab is undefined", () => {
    expect(formatTitle(undefined)).toBe("BrainRust");
  });

  it("returns tab title when not dirty", () => {
    const tab = makeTab({ title: "My Map", isDirty: false });
    expect(formatTitle(tab)).toBe("My Map");
  });

  it("appends asterisk when tab is dirty", () => {
    const tab = makeTab({ title: "My Map", isDirty: true });
    expect(formatTitle(tab)).toBe("My Map*");
  });

  it("handles empty title", () => {
    const tab = makeTab({ title: "", isDirty: false });
    expect(formatTitle(tab)).toBe("");
  });

  it("handles empty title with dirty flag", () => {
    const tab = makeTab({ title: "", isDirty: true });
    expect(formatTitle(tab)).toBe("*");
  });
});
