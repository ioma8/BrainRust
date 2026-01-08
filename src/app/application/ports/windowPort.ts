export type WindowPort = {
  setTitle: (title: string) => Promise<void>;
  close: () => Promise<void>;
  destroy: () => Promise<void>;
};
