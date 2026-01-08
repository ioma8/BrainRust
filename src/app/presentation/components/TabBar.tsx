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
      className="flex items-end bg-base-200 px-2"
    >
      <div id="tabs" role="tablist" className="tabs tabs-lift flex-1 overflow-x-auto">
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
                "tab group gap-2 text-sm transition",
                isActive ? "tab-active font-semibold" : ""
              ].join(" ")}
            >
              <span className="truncate">
                {tab.title}
                {tab.isDirty ? "*" : ""}
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-xs h-5 min-h-5 w-5 rounded-full p-0 opacity-70 hover:bg-base-300"
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
          className="tab gap-2 text-sm"
          onClick={onNewTab}
        >
          +
        </button>
      </div>
    </div>
  );
}
