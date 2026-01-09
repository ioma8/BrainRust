/* @vitest-environment jsdom */
import { render } from "@testing-library/preact";
import { afterEach, expect, test, vi } from "vitest";
import { useMenuHandler } from "../useMenuHandler";
import { flushPromises } from "./hookTestUtils";

const unlistenMenu = vi.fn();
const unlistenRecent = vi.fn();
let menuHandler: ((event: { payload: string }) => void) | null = null;
let recentHandler: ((event: { payload: string }) => void) | null = null;

vi.mock("../../../infrastructure/tauri/eventApi", () => ({
  events: {
    listen: vi.fn((eventName: string, handler: (event: { payload: string }) => void) => {
      if (eventName === "menu-event") menuHandler = handler;
      if (eventName === "menu-open-recent") recentHandler = handler;
      const unlisten = eventName === "menu-event" ? unlistenMenu : unlistenRecent;
      return Promise.resolve(unlisten);
    })
  }
}));

afterEach(() => {
  unlistenMenu.mockClear();
  unlistenRecent.mockClear();
  menuHandler = null;
  recentHandler = null;
});

test("routes menu events to actions", async () => {
  const actions = {
    onNew: vi.fn(),
    onOpen: vi.fn(),
    onSave: vi.fn(),
    onSaveAs: vi.fn(),
    onSaveCloud: vi.fn(),
    onOpenCloud: vi.fn(),
    onCloudAuth: vi.fn(),
    onExit: vi.fn(),
    onAddChild: vi.fn(),
    onAddSibling: vi.fn(),
    onDeleteNode: vi.fn(),
    onRenameNode: vi.fn(),
    onAbout: vi.fn(),
    onOpenRecent: vi.fn()
  };

  function Wrapper() {
    useMenuHandler(actions);
    return null;
  }

  render(<Wrapper />);
  await flushPromises();

  menuHandler?.({ payload: "open" });
  menuHandler?.({ payload: "save_as" });
  menuHandler?.({ payload: "cloud_auth" });
  recentHandler?.({ payload: "/tmp/example.mm" });

  expect(actions.onOpen).toHaveBeenCalledTimes(1);
  expect(actions.onSaveAs).toHaveBeenCalledTimes(1);
  expect(actions.onCloudAuth).toHaveBeenCalledTimes(1);
  expect(actions.onOpenRecent).toHaveBeenCalledWith("/tmp/example.mm");
});

test("cleans up menu listeners on unmount", async () => {
  const actions = {
    onNew: vi.fn(),
    onOpen: vi.fn(),
    onSave: vi.fn(),
    onSaveAs: vi.fn(),
    onSaveCloud: vi.fn(),
    onOpenCloud: vi.fn(),
    onCloudAuth: vi.fn(),
    onExit: vi.fn(),
    onAddChild: vi.fn(),
    onAddSibling: vi.fn(),
    onDeleteNode: vi.fn(),
    onRenameNode: vi.fn(),
    onAbout: vi.fn(),
    onOpenRecent: vi.fn()
  };

  function Wrapper() {
    useMenuHandler(actions);
    return null;
  }

  const view = render(<Wrapper />);
  await flushPromises();
  view.unmount();

  expect(unlistenMenu).toHaveBeenCalledTimes(1);
  expect(unlistenRecent).toHaveBeenCalledTimes(1);
});
