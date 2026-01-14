import type { Session } from "@supabase/supabase-js";
import type { MindMap } from "../../../types";

export type CloudMapSummary = {
  id: string;
  title: string;
  updatedAt: string;
};

export type CloudMapDetail = CloudMapSummary & {
  content: MindMap;
};

export type AuthChangeCallback = (session: Session | null) => void;

export type AuthSubscription = {
  data: {
    subscription: {
      unsubscribe: () => void;
    };
  };
};

export interface CloudPort {
  getSession(): Promise<Session | null>;
  onAuthChange(callback: AuthChangeCallback): AuthSubscription;
  signIn(email: string, password: string): Promise<Session | null>;
  signUp(email: string, password: string): Promise<Session | null>;
  signOut(): Promise<void>;
  listMaps(): Promise<CloudMapSummary[]>;
  loadMap(mapId: string): Promise<CloudMapDetail>;
  saveMap(mapId: string | null, title: string, content: MindMap, userId: string): Promise<CloudMapSummary>;
}
