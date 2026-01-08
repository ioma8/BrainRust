import { useState } from "preact/hooks";
import type { CloudMapSummary } from "../../infrastructure/supabase/cloudApi";

type CloudPanelProps = {
  isOpen: boolean;
  isConfigured: boolean;
  isLoading: boolean;
  error: string | null;
  sessionEmail: string | null;
  maps: CloudMapSummary[];
  canSave: boolean;
  onClose: () => void;
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<void>;
  onSignOut: () => Promise<void>;
  onRefresh: () => Promise<void>;
  onLoadMap: (mapId: string) => Promise<void>;
  onSaveMap: () => Promise<void>;
};

export function CloudPanel({
  isOpen,
  isConfigured,
  isLoading,
  error,
  sessionEmail,
  maps,
  canSave,
  onClose,
  onSignIn,
  onSignUp,
  onSignOut,
  onRefresh,
  onLoadMap,
  onSaveMap
}: CloudPanelProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const disabled = isLoading || !isConfigured;

  async function handleSignIn() {
    if (!email || !password) return;
    await onSignIn(email, password);
  }

  async function handleSignUp() {
    if (!email || !password) return;
    await onSignUp(email, password);
  }

  async function handleSignOut() {
    await onSignOut();
  }

  if (!isOpen) return null;

  return (
    <div className="modal modal-open" role="dialog" aria-modal="true">
      <div className="modal-box max-w-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold">Cloud Maps</h3>
            <p className="text-sm opacity-70">Sign in to sync your maps.</p>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            ✕
          </button>
        </div>

        {!isConfigured ? (
          <div className="mt-4 rounded-lg border border-base-300 bg-base-200 p-3 text-sm">
            Supabase is not configured. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {error ? (
              <div className="alert alert-error text-sm">
                <span>{error}</span>
              </div>
            ) : null}

            {!sessionEmail ? (
              <div className="space-y-3">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Email</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onInput={(event) => setEmail(event.currentTarget.value)}
                    className="input input-bordered input-sm"
                    placeholder="you@example.com"
                    disabled={disabled}
                  />
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Password</span>
                  </label>
                  <input
                    type="password"
                    value={password}
                    onInput={(event) => setPassword(event.currentTarget.value)}
                    className="input input-bordered input-sm"
                    placeholder="••••••••"
                    disabled={disabled}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={disabled || !email || !password}
                    onClick={handleSignIn}
                  >
                    Sign in
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    disabled={disabled || !email || !password}
                    onClick={handleSignUp}
                  >
                    Sign up
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm">
                    Signed in as <span className="font-semibold">{sessionEmail}</span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={disabled}
                    onClick={handleSignOut}
                  >
                    Sign out
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={disabled || !canSave}
                    onClick={onSaveMap}
                  >
                    Save current map
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={disabled}
                    onClick={onRefresh}
                  >
                    Refresh list
                  </button>
                </div>
                <div className="divider my-1">Your maps</div>
                <div className="max-h-64 space-y-2 overflow-y-auto">
                  {maps.length === 0 ? (
                    <div className="text-sm opacity-70">No saved maps yet.</div>
                  ) : (
                    maps.map((map) => (
                      <div
                        key={map.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-base-300 bg-base-200 px-3 py-2"
                      >
                        <div>
                          <div className="text-sm font-medium">{map.title}</div>
                          <div className="text-xs opacity-60">
                            {new Date(map.updatedAt).toLocaleString()}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn btn-outline btn-xs"
                          disabled={disabled}
                          onClick={() => onLoadMap(map.id)}
                        >
                          Load
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <form method="dialog" className="modal-backdrop" onClick={onClose}>
        <button type="button" className="hidden">
          close
        </button>
      </form>
    </div>
  );
}
