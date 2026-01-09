import { useEffect } from "preact/hooks";
import { events } from "../../infrastructure/tauri/eventApi";

type MenuActions = {
  onNew: () => Promise<void>;
  onOpen: () => Promise<void>;
  onSave: () => Promise<void>;
  onSaveAs: () => Promise<void>;
  onSaveCloud: () => Promise<void>;
  onOpenCloud: () => void;
  onCloudAuth: () => void;
  onExit: () => Promise<void>;
  onAddChild: () => Promise<void>;
  onAddSibling: () => Promise<void>;
  onDeleteNode: () => Promise<void>;
  onRenameNode: () => void;
  onAbout: () => Promise<void>;
  onOpenRecent: (path: string) => Promise<void>;
};

export function useMenuHandler(actions: MenuActions) {
  useEffect(() => {
    let unlistenMenu: (() => void) | undefined;
    let unlistenRecent: (() => void) | undefined;

    events.listen("menu-event", async (event) => {
      const action = event.payload as string;
      if (action === "new") return actions.onNew();
      if (action === "open") return actions.onOpen();
      if (action === "save") return actions.onSave();
      if (action === "save_as") return actions.onSaveAs();
      if (action === "save_cloud") return actions.onSaveCloud();
      if (action === "open_cloud") return actions.onOpenCloud();
      if (action === "cloud_auth") return actions.onCloudAuth();
      if (action === "exit") return actions.onExit();
      if (action === "add_child") return actions.onAddChild();
      if (action === "add_sibling") return actions.onAddSibling();
      if (action === "delete_node") return actions.onDeleteNode();
      if (action === "rename_node") return actions.onRenameNode();
      if (action === "about") return actions.onAbout();
    }).then((fn) => {
      unlistenMenu = fn;
    });

    events.listen("menu-open-recent", async (event) => {
      const path = event.payload as string;
      if (!path) return;
      await actions.onOpenRecent(path);
    }).then((fn) => {
      unlistenRecent = fn;
    });

    return () => {
      if (unlistenMenu) unlistenMenu();
      if (unlistenRecent) unlistenRecent();
    };
  }, [actions]);
}
