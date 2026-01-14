import type { DialogPort } from "../ports/dialogPort";
import type { IdPort } from "../ports/idPort";
import type { LayoutPort } from "../ports/layoutPort";
import type { MapFilePort } from "../ports/mapFilePort";
import type { WindowPort } from "../ports/windowPort";
import type { CloudPort } from "../ports/cloudPort";

export type AppDependencies = {
  id: IdPort;
  layout: LayoutPort;
  mapFile: MapFilePort;
  dialog: DialogPort;
  window: WindowPort;
  cloud: CloudPort;
};
