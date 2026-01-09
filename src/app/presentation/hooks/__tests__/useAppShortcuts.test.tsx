/* @vitest-environment jsdom */
import { render } from "@testing-library/preact";
import { expect, test, vi } from "vitest";
import { flushPromises } from "./hookTestUtils";
import { useAppShortcuts } from "../useAppShortcuts";

test("handles tab shortcuts", async () => {
  const createNewTab = vi.fn().mockResolvedValue(undefined);
  const closeTab = vi.fn().mockResolvedValue(undefined);
  const cycleTab = vi.fn();
  const getActiveTab = vi.fn(() => ({ id: "tab-1" }));

  function Wrapper() {
    useAppShortcuts({
      isEditingRef: { current: false },
      getActiveTab,
      createNewTab,
      closeTab,
      cycleTab,
      finishEdit: vi.fn(),
      closeEditor: vi.fn(),
      navigateSelection: vi.fn(),
      addNodeWithEditor: vi.fn(),
      removeSelectedNode: vi.fn(),
      startEdit: vi.fn(),
      saveActiveTab: vi.fn(),
      openMap: vi.fn()
    });
    return null;
  }

  render(<Wrapper />);

  window.dispatchEvent(new KeyboardEvent("keydown", { key: "t", metaKey: true }));
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "w", metaKey: true }));
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", ctrlKey: true }));
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", ctrlKey: true, shiftKey: true }));

  await flushPromises();

  expect(createNewTab).toHaveBeenCalledTimes(1);
  expect(closeTab).toHaveBeenCalledWith("tab-1");
  expect(cycleTab).toHaveBeenCalledWith(1);
  expect(cycleTab).toHaveBeenCalledWith(-1);
});

test("handles editing and navigation shortcuts", async () => {
  const finishEdit = vi.fn().mockResolvedValue(undefined);
  const closeEditor = vi.fn();
  const navigateSelection = vi.fn().mockResolvedValue(true);
  const addNodeWithEditor = vi.fn().mockResolvedValue(undefined);
  const saveActiveTab = vi.fn().mockResolvedValue(undefined);

  function Wrapper() {
    useAppShortcuts({
      isEditingRef: { current: true },
      getActiveTab: vi.fn(),
      createNewTab: vi.fn(),
      closeTab: vi.fn(),
      cycleTab: vi.fn(),
      finishEdit,
      closeEditor,
      navigateSelection,
      addNodeWithEditor,
      removeSelectedNode: vi.fn(),
      startEdit: vi.fn(),
      saveActiveTab,
      openMap: vi.fn()
    });
    return null;
  }

  render(<Wrapper />);

  window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "Insert" }));
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "s", ctrlKey: true }));

  await flushPromises();

  expect(finishEdit).toHaveBeenCalledTimes(1);
  expect(closeEditor).toHaveBeenCalledTimes(1);
  expect(navigateSelection).not.toHaveBeenCalled();
  expect(addNodeWithEditor).not.toHaveBeenCalled();
  expect(saveActiveTab).not.toHaveBeenCalled();
});

test("handles navigation and file shortcuts when not editing", async () => {
  const navigateSelection = vi.fn().mockResolvedValue(true);
  const addNodeWithEditor = vi.fn().mockResolvedValue(undefined);
  const saveActiveTab = vi.fn().mockResolvedValue(undefined);
  const openMap = vi.fn().mockResolvedValue(undefined);

  function Wrapper() {
    useAppShortcuts({
      isEditingRef: { current: false },
      getActiveTab: vi.fn(),
      createNewTab: vi.fn(),
      closeTab: vi.fn(),
      cycleTab: vi.fn(),
      finishEdit: vi.fn(),
      closeEditor: vi.fn(),
      navigateSelection,
      addNodeWithEditor,
      removeSelectedNode: vi.fn(),
      startEdit: vi.fn(),
      saveActiveTab,
      openMap
    });
    return null;
  }

  render(<Wrapper />);

  window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft" }));
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "Insert" }));
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "s", metaKey: true }));
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "o", metaKey: true }));

  await flushPromises();

  expect(navigateSelection).toHaveBeenCalledWith("Left");
  expect(addNodeWithEditor).toHaveBeenCalledWith("child");
  expect(saveActiveTab).toHaveBeenCalledWith(false);
  expect(openMap).toHaveBeenCalledTimes(1);
});
