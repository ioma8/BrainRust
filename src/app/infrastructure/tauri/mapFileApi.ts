import { invoke } from "@tauri-apps/api/core";
import type { MindMap } from "../../../types";

export function loadMap(path: string) {
  return invoke<MindMap>("load_map_file", { path });
}

export function saveMap(path: string, map: MindMap) {
  return invoke<string>("save_map_file", { path, map });
}
