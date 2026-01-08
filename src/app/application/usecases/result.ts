import type { MindMap } from "../../../types";
import type { Point } from "../../domain/layout/types";
import type { AppState } from "../state/tabState";

export type RenderCommand = { map: MindMap; offset: Point };

export type UsecaseResult = { state: AppState; render?: RenderCommand };
