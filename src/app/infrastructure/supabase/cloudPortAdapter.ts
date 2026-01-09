import type { CloudPort, CloudMapSummary, CloudMapDetail, AuthChangeCallback, AuthSubscription } from "../../application/ports/cloudPort";
import * as cloudApi from "./cloudApi";

export function createCloudPortAdapter(): CloudPort {
  return {
    async getSession() {
      return cloudApi.getSession();
    },

    onAuthChange(callback: AuthChangeCallback): AuthSubscription {
      return cloudApi.onAuthChange(callback);
    },

    async signIn(email: string, password: string) {
      return cloudApi.signIn(email, password);
    },

    async signUp(email: string, password: string) {
      return cloudApi.signUp(email, password);
    },

    async signOut() {
      return cloudApi.signOut();
    },

    async listMaps(): Promise<CloudMapSummary[]> {
      return cloudApi.listMaps();
    },

    async loadMap(mapId: string): Promise<CloudMapDetail> {
      return cloudApi.loadMap(mapId);
    },

    async saveMap(mapId: string | null, title: string, content, userId: string): Promise<CloudMapSummary> {
      return cloudApi.saveMap(mapId, title, content, userId);
    }
  };
}
