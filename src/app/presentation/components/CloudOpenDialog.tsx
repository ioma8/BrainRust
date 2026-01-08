import { useMemo } from "preact/hooks";
import type { CloudMapSummary } from "../../infrastructure/supabase/cloudApi";

export type CloudSort = "date_desc" | "date_asc" | "name_asc" | "name_desc";

type CloudOpenDialogProps = {
  isOpen: boolean;
  isLoggedIn: boolean;
  isLoading: boolean;
  error: string | null;
  maps: CloudMapSummary[];
  sort: CloudSort;
  onSortChange: (sort: CloudSort) => void;
  onRefresh: () => Promise<void>;
  onSelect: (mapId: string) => Promise<void>;
  onOpenAccount: () => void;
  onClose: () => void;
};

function formatUpdatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export function CloudOpenDialog({
  isOpen,
  isLoggedIn,
  isLoading,
  error,
  maps,
  sort,
  onSortChange,
  onRefresh,
  onSelect,
  onOpenAccount,
  onClose
}: CloudOpenDialogProps) {
  const sortedMaps = useMemo(() => {
    const copy = [...maps];
    const byDateAsc = (a: CloudMapSummary, b: CloudMapSummary) =>
      new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
    const byNameAsc = (a: CloudMapSummary, b: CloudMapSummary) =>
      a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
    if (sort === "date_desc") copy.sort((a, b) => byDateAsc(b, a));
    if (sort === "date_asc") copy.sort(byDateAsc);
    if (sort === "name_desc") copy.sort((a, b) => byNameAsc(b, a));
    if (sort === "name_asc") copy.sort(byNameAsc);
    return copy;
  }, [maps, sort]);

  if (!isOpen) return null;

  return (
    <div className="modal modal-open" role="dialog" aria-modal="true">
      <div className="modal-box max-w-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold">Open from cloud</h3>
            <p className="text-sm opacity-70">Select a map to open in a new tab.</p>
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

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <label className="flex items-center gap-2 text-sm">
            <span className="opacity-70">Sort</span>
            <select
              className="select select-bordered select-sm"
              value={sort}
              onChange={(event) => onSortChange(event.currentTarget.value as CloudSort)}
              disabled={isLoading}
            >
              <option value="date_desc">Date (newest)</option>
              <option value="date_asc">Date (oldest)</option>
              <option value="name_asc">Name (A–Z)</option>
              <option value="name_desc">Name (Z–A)</option>
            </select>
          </label>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => void onRefresh()}
            disabled={isLoading || !isLoggedIn}
          >
            Refresh
          </button>
        </div>

        {!isLoggedIn ? (
          <div className="mt-4 alert text-sm">
            <span>Sign in to your cloud account to see your saved maps.</span>
            <button type="button" className="btn btn-primary btn-sm" onClick={onOpenAccount}>
              Cloud account
            </button>
          </div>
        ) : null}

        <div className="mt-4 max-h-[60vh] overflow-auto rounded-box border border-base-300">
          <table className="table table-zebra table-sm">
            <thead>
              <tr>
                <th>Name</th>
                <th className="w-64">Updated</th>
              </tr>
            </thead>
            <tbody>
              {sortedMaps.length === 0 ? (
                <tr>
                  <td colSpan={2} className="py-6 text-center opacity-70">
                    {!isLoggedIn ? "Not signed in." : isLoading ? "Loading..." : "No cloud maps found."}
                  </td>
                </tr>
              ) : (
                sortedMaps.map((map) => (
                  <tr
                    key={map.id}
                    className="cursor-pointer"
                    onClick={() => {
                      if (isLoggedIn) void onSelect(map.id);
                    }}
                  >
                    <td className="max-w-[32rem] truncate">{map.title}</td>
                    <td className="opacity-70">{formatUpdatedAt(map.updatedAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop" onClick={onClose}>
        <button type="button">close</button>
      </form>
    </div>
  );
}
