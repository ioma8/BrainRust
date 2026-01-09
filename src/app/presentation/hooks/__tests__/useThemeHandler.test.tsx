/**
 * @vitest-environment jsdom
 */
import { act } from "preact/test-utils";
import { describe, expect, it, beforeEach } from "vitest";
import { renderHook } from "./hookTestUtils";
import { useThemeHandler } from "../useThemeHandler";
import { THEME_STORAGE_KEY } from "../../theme/theme";

describe("useThemeHandler", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("loads theme from storage and persists on change", async () => {
    localStorage.setItem(THEME_STORAGE_KEY, "dark");
    const { result } = renderHook(() => useThemeHandler());

    expect(result.theme).toBe("dark");

    await act(async () => {
      result.applyTheme("light");
    });

    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
  });
});
