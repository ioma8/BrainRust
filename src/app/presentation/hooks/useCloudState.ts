import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import type { Session } from "@supabase/supabase-js";
import type { AppState } from "../../application/state/tabState";
import type { AppDependencies } from "../../application/usecases/types";
import type { UsecaseResult } from "../../application/usecases/result";
import type { CloudMapSummary } from "../../infrastructure/supabase/cloudApi";
import * as cloudApi from "../../infrastructure/supabase/cloudApi";
import { openCloudMap as openCloudMapUsecase } from "../../application/usecases/cloud";
import type { CloudSort } from "../components/CloudOpenDialog";

type CloudStateDeps = {
  stateRef: { current: AppState };
  deps: AppDependencies;
  applyResult: (result: UsecaseResult) => void;
  isSupabaseConfigured: boolean;
};

export function useCloudState({ stateRef, deps, applyResult, isSupabaseConfigured }: CloudStateDeps) {
  const [isCloudOpen, setIsCloudOpen] = useState(false);
  const [isCloudOpenDialogOpen, setIsCloudOpenDialogOpen] = useState(false);
  const [cloudSort, setCloudSort] = useState<CloudSort>("date_desc");
  const [cloudSession, setCloudSession] = useState<Session | null>(null);
  const cloudSessionRef = useRef<Session | null>(null);
  const [cloudMaps, setCloudMaps] = useState<CloudMapSummary[]>([]);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [cloudBusy, setCloudBusy] = useState(false);
  const [isOnline, setIsOnline] = useState(() => {
    return typeof navigator.onLine === "boolean" ? navigator.onLine : true;
  });

  const formatCloudError = useCallback((error: unknown) => {
    if (error instanceof Error) return error.message;
    if (typeof error === "string") return error;
    return "Unexpected cloud error.";
  }, []);

  const runCloudAction = useCallback(async (action: () => Promise<void>) => {
    setCloudBusy(true);
    setCloudError(null);
    try {
      await action();
    } catch (error) {
      setCloudError(formatCloudError(error));
    } finally {
      setCloudBusy(false);
    }
  }, [formatCloudError]);

  const refreshCloudMaps = useCallback(async (sessionOverride?: Session | null) => {
    const session = sessionOverride ?? cloudSessionRef.current;
    if (!session) {
      setCloudMaps([]);
      return;
    }
    const maps = await cloudApi.listMaps();
    setCloudMaps(maps);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let isActive = true;
    void runCloudAction(async () => {
      const session = await cloudApi.getSession();
      if (!isActive) return;
      setCloudSession(session);
      cloudSessionRef.current = session;
      await refreshCloudMaps(session);
    });
    const { data } = cloudApi.onAuthChange((session) => {
      void runCloudAction(async () => {
        setCloudSession(session);
        cloudSessionRef.current = session;
        await refreshCloudMaps(session);
      });
    });
    return () => {
      isActive = false;
      data.subscription.unsubscribe();
    };
  }, [isSupabaseConfigured, refreshCloudMaps, runCloudAction]);

  useEffect(() => {
    const sync = () => {
      setIsOnline(typeof navigator.onLine === "boolean" ? navigator.onLine : true);
    };
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  const refreshCloud = useCallback(async () => {
    await runCloudAction(async () => {
      await refreshCloudMaps();
    });
  }, [refreshCloudMaps, runCloudAction]);

  const signInCloud = useCallback(async (email: string, password: string) => {
    await runCloudAction(async () => {
      const session = await cloudApi.signIn(email, password);
      setCloudSession(session);
      cloudSessionRef.current = session;
      await refreshCloudMaps(session);
    });
  }, [refreshCloudMaps, runCloudAction]);

  const signUpCloud = useCallback(async (email: string, password: string) => {
    await runCloudAction(async () => {
      const session = await cloudApi.signUp(email, password);
      setCloudSession(session);
      cloudSessionRef.current = session;
      await refreshCloudMaps(session);
    });
  }, [refreshCloudMaps, runCloudAction]);

  const signOutCloud = useCallback(async () => {
    await runCloudAction(async () => {
      await cloudApi.signOut();
      setCloudSession(null);
      cloudSessionRef.current = null;
      setCloudMaps([]);
    });
  }, [runCloudAction]);

  const loadCloudMap = useCallback(async (mapId: string) => {
    await runCloudAction(async () => {
      const detail = await cloudApi.loadMap(mapId);
      const result = await openCloudMapUsecase(
        stateRef.current,
        deps,
        detail.title,
        detail.content,
        detail.id
      );
      applyResult(result);
    });
  }, [applyResult, deps, runCloudAction, stateRef]);

  const isOffline = useCallback(() => !isOnline, [isOnline]);

  const isCloudAvailable = useCallback(() => {
    const hasSession = Boolean(cloudSessionRef.current?.user?.email);
    return isSupabaseConfigured && hasSession && !isOffline();
  }, [isSupabaseConfigured, isOffline]);

  return {
    isCloudOpen,
    setIsCloudOpen,
    isCloudOpenDialogOpen,
    setIsCloudOpenDialogOpen,
    cloudSort,
    setCloudSort,
    cloudSession,
    cloudSessionRef,
    cloudMaps,
    cloudError,
    cloudBusy,
    setCloudError,
    setCloudBusy,
    runCloudAction,
    refreshCloudMaps,
    refreshCloud,
    signInCloud,
    signUpCloud,
    signOutCloud,
    loadCloudMap,
    isOffline,
    isCloudAvailable
  };
}
