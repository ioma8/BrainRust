import type { MindMap } from "../../../types";

export type MapFilePort = {
  loadMap: (path: string) => Promise<MindMap>;
  saveMap: (path: string, map: MindMap) => Promise<string>;
};
