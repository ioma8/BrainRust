export type DialogFilter = { name: string; extensions: string[] };

export type OpenDialogOptions = {
  multiple: boolean;
  directory: boolean;
  filters: DialogFilter[];
};

export type SaveDialogOptions = {
  filters: DialogFilter[];
  defaultPath?: string;
};

export type DialogMessageOptions = {
  title: string;
  kind: "info" | "warning" | "error";
};

export type DialogPort = {
  open: (options: OpenDialogOptions) => Promise<string | string[] | null>;
  save: (options: SaveDialogOptions) => Promise<string | null>;
  confirm: (message: string, options: DialogMessageOptions) => Promise<boolean>;
  ask: (message: string, options: DialogMessageOptions) => Promise<void>;
};
