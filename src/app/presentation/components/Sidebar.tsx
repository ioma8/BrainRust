import type { Theme } from "../theme/theme";
import { iconMap } from "../constants/icons";

type SidebarProps = {
  theme: Theme;
  iconButtons: string[];
  onThemeChange: (theme: Theme) => void;
  onIconClick: (key: string) => void;
};

export function Sidebar({ theme, iconButtons, onThemeChange, onIconClick }: SidebarProps) {
  return (
    <div
      id="sidebar"
      className="z-20 flex h-full w-11 flex-col border-r border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] shadow-[2px_0_12px_rgba(15,23,42,0.08)]"
    >
      <div
        id="toolbar-fixed"
        className="flex flex-col items-center gap-2 border-b border-[var(--toolbar-border)] bg-[var(--sidebar-bg)] py-3"
      >
        <input
          type="checkbox"
          value="dark"
          className="toggle toggle-sm theme-controller"
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          checked={theme === "dark"}
          onChange={(event) => onThemeChange(event.currentTarget.checked ? "dark" : "light")}
        />
        <button
          type="button"
          className="icon-btn rounded-md px-1.5 py-1 text-base transition hover:bg-[var(--tab-button-hover)]"
          title="trash"
          onClick={() => onIconClick("trash")}
        >
          {iconMap.trash}
        </button>
      </div>
      <div
        id="toolbar-scrollable"
        className="flex flex-1 flex-col items-center overflow-y-auto overflow-x-hidden py-1.5"
      >
        {iconButtons.map((key) => (
          <button
            type="button"
            key={key}
            className="icon-btn rounded-md px-1.5 py-1 text-base transition hover:bg-[var(--tab-button-hover)]"
            title={key}
            onClick={() => onIconClick(key)}
          >
            {iconMap[key]}
          </button>
        ))}
      </div>
    </div>
  );
}
