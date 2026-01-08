import { useEffect, useState } from "preact/hooks";

type CloudSaveDialogProps = {
  isOpen: boolean;
  isLoggedIn: boolean;
  isLoading: boolean;
  error: string | null;
  defaultTitle: string;
  onSave: (title: string) => Promise<void>;
  onOpenAccount: () => void;
  onClose: () => void;
};

export function CloudSaveDialog({
  isOpen,
  isLoggedIn,
  isLoading,
  error,
  defaultTitle,
  onSave,
  onOpenAccount,
  onClose
}: CloudSaveDialogProps) {
  const [title, setTitle] = useState(defaultTitle);

  useEffect(() => {
    if (!isOpen) return;
    setTitle(defaultTitle);
  }, [defaultTitle, isOpen]);

  if (!isOpen) return null;

  const trimmed = title.trim();
  const disabled = isLoading || trimmed.length === 0 || !isLoggedIn;

  return (
    <div className="modal modal-open" role="dialog" aria-modal="true">
      <div className="modal-box max-w-md">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold">Save to cloud</h3>
            <p className="text-sm opacity-70">Choose a name and save this map to your account.</p>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            ✕
          </button>
        </div>

        {error ? (
          <div className="mt-4 alert alert-error text-sm">
            <span>{error}</span>
          </div>
        ) : null}

        {!isLoggedIn ? (
          <div className="mt-4 alert text-sm">
            <span>Sign in to your cloud account to save maps.</span>
            <button type="button" className="btn btn-primary btn-sm" onClick={onOpenAccount}>
              Cloud account
            </button>
          </div>
        ) : null}

        <div className="mt-5 form-control">
          <label className="label">
            <span className="label-text">Map name</span>
          </label>
          <input
            type="text"
            className="input input-bordered"
            value={title}
            onInput={(event) => setTitle(event.currentTarget.value)}
            disabled={isLoading || !isLoggedIn}
          />
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={isLoading}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={disabled}
            onClick={() => void onSave(trimmed)}
          >
            Save to cloud
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop" onClick={onClose}>
        <button type="button">close</button>
      </form>
    </div>
  );
}
