import { ask, confirm, open, save } from "@tauri-apps/plugin-dialog";

export const dialog = {
  ask: async (message: string, options: { title: string; kind: "info" | "warning" | "error" }) => {
    await ask(message, options);
  },
  confirm,
  open,
  save
};
