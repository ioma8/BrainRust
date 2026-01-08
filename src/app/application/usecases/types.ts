import type { DialogPort } from "../ports/dialogPort";
import type { IdPort } from "../ports/idPort";
import type { LayoutPort } from "../ports/layoutPort";
import type { MindMapPort } from "../ports/mindMapPort";
import type { WindowPort } from "../ports/windowPort";

export type AppDependencies = {
  id: IdPort;
  layout: LayoutPort;
  mindmap: MindMapPort;
  dialog: DialogPort;
  window: WindowPort;
};
