type SaveTargetDialogProps = {
  isOpen: boolean;
  onSelect: (target: "local" | "cloud") => void;
  onClose: () => void;
};

export function SaveTargetDialog({ isOpen, onSelect, onClose }: SaveTargetDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="modal modal-open" role="dialog" aria-modal="true">
      <div className="modal-box max-w-md">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold">Save map</h3>
            <p className="text-sm opacity-70">Choose where to save this mind map.</p>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => onSelect("local")}
          >
            Save locally
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onSelect("cloud")}
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
