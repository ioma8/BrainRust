import type { Session } from "@supabase/supabase-js";
import type { MindMap } from "../../../types";
import { isSupabaseConfigured, supabase } from "./client";

export type CloudMapSummary = {
  id: string;
  title: string;
  updatedAt: string;
};

export type CloudMapDetail = CloudMapSummary & {
  content: MindMap;
};

function getClient() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Supabase is not configured.");
  }
  return supabase;
}

export async function getSession(): Promise<Session | null> {
  const client = getClient();
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  return data.session ?? null;
}

export function onAuthChange(callback: (session: Session | null) => void) {
  const client = getClient();
  return client.auth.onAuthStateChange((_event, session) => callback(session));
}

export async function signIn(email: string, password: string) {
  const client = getClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session ?? null;
}

export async function signUp(email: string, password: string) {
  const client = getClient();
  const { data, error } = await client.auth.signUp({ email, password });
  if (error) throw error;
  return data.session ?? null;
}

export async function signOut() {
  const client = getClient();
  const { error } = await client.auth.signOut();
  if (error) throw error;
}

export async function listMaps(): Promise<CloudMapSummary[]> {
  const client = getClient();
  const { data, error } = await client
    .from("mindmaps")
    .select("id,title,updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    updatedAt: row.updated_at
  }));
}

export async function loadMap(mapId: string): Promise<CloudMapDetail> {
  const client = getClient();
  const { data, error } = await client
    .from("mindmaps")
    .select("id,title,content,updated_at")
    .eq("id", mapId)
    .single();
  if (error || !data) throw error ?? new Error("Map not found.");
  return {
    id: data.id,
    title: data.title,
    updatedAt: data.updated_at,
    content: data.content as MindMap
  };
}

export async function saveMap(
  mapId: string | null,
  title: string,
  content: MindMap,
  userId: string
): Promise<CloudMapSummary> {
  const client = getClient();
  const payload = {
    id: mapId ?? undefined,
    title,
    content,
    user_id: userId
  };
  const { data, error } = await client
    .from("mindmaps")
    .upsert(payload)
    .select("id,title,updated_at")
    .single();
  if (error || !data) throw error ?? new Error("Failed to save map.");
  return {
    id: data.id,
    title: data.title,
    updatedAt: data.updated_at
  };
}
