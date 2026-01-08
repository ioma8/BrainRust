import type { TabState } from "../../application/state/tabState";

type TabBarProps = {
  tabs: TabState[];
  activeTabId: string | null;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onNewTab: () => void;
};

export function TabBar({ tabs, activeTabId, onSelectTab, onCloseTab, onNewTab }: TabBarProps) {
  return (
    <div
      id="tab-bar"
      className="flex h-[var(--tabbar-height)] items-center gap-2 border-b border-[var(--tab-border)] bg-[var(--tabbar-bg)] px-2 shadow-[0_1px_0_rgba(15,23,42,0.06)]"
    >
      <div id="tabs" className="flex flex-1 items-center gap-1.5 overflow-x-auto py-1">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              title={tab.filePath || tab.title}
              onClick={() => onSelectTab(tab.id)}
              className={[
                "inline-flex max-w-[220px] cursor-pointer items-center gap-2 overflow-hidden rounded-t-lg rounded-b-md border px-3 py-1.5 text-[13px] transition",
                "border-[var(--tab-border)] bg-[var(--tab-bg)] text-[var(--tab-text)] hover:border-[var(--tab-active-border)] hover:bg-[var(--tab-active-bg)]",
                isActive
                  ? "border-[var(--tab-active-border)] bg-[var(--tab-active-bg)] text-[var(--tab-text-active)] shadow-[0_6px_16px_rgba(15,23,42,0.12)]"
                  : ""
              ].join(" ")}
            >
              <span className="truncate">
                {tab.title}
                {tab.isDirty ? "*" : ""}
              </span>
              <button
                type="button"
                className="flex h-4 w-4 items-center justify-center rounded-full text-xs opacity-60 transition hover:bg-[var(--tab-close-hover)] hover:opacity-100"
                onClick={(event) => {
                  event.stopPropagation();
                  onCloseTab(tab.id);
                }}
              >
                ×
              </button>
            </div>
          );
        })}
        <button
          id="new-tab-btn"
          type="button"
          aria-label="New tab"
          className="flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-full border border-[var(--tab-border)] bg-transparent text-[var(--tab-text)] transition hover:border-[var(--tab-active-border)] hover:bg-[var(--tab-button-hover)]"
          onClick={onNewTab}
        >
          +
        </button>
      </div>
    </div>
  );
}
