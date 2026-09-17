import type {
  AlertOptions,
  ConfirmOptions,
  DialogKind,
  DialogRequest,
  DialogSnapshot,
  PromptOptions,
} from "./types";

export interface DialogStore {
  subscribe(listener: () => void): () => void;
  getSnapshot(): DialogSnapshot;
  getServerSnapshot(): DialogSnapshot;
  open(kind: "alert", options: AlertOptions): Promise<void>;
  open(kind: "confirm", options: ConfirmOptions): Promise<boolean>;
  open(kind: "prompt", options: PromptOptions): Promise<string | null>;
  /** Closes a request and settles its promise. */
  resolve(id: string, confirmed: boolean, value?: string): void;
  /** Cancels every open and waiting dialog. */
  dismissAll(): void;
}

const EMPTY: DialogSnapshot = { queue: [] };

/** What each kind's promise resolves with. */
export function resultFor(kind: DialogKind, confirmed: boolean, value = ""): boolean | string | null | undefined {
  if (kind === "confirm") return confirmed;
  if (kind === "prompt") return confirmed ? value : null;
  return undefined;
}

/**
 * A queue of dialogs, one on screen at a time, with no React. Each request is a
 * promise that settles when the user answers, so callers can simply `await` it.
 */
export function createDialogStore(): DialogStore {
  let snapshot: DialogSnapshot = EMPTY;
  let counter = 0;
  const listeners = new Set<() => void>();
  const settlers = new Map<string, (result: unknown) => void>();

  function commit(queue: readonly DialogRequest[]) {
    snapshot = { queue };
    for (const listener of listeners) listener();
  }

  function open(kind: DialogKind, options: AlertOptions | ConfirmOptions | PromptOptions) {
    const id = `dialog-${++counter}`;
    return new Promise<unknown>((resolve) => {
      settlers.set(id, resolve);
      commit([...snapshot.queue, { id, kind, options } as DialogRequest]);
    });
  }

  function resolve(id: string, confirmed: boolean, value?: string) {
    const request = snapshot.queue.find((item) => item.id === id);
    const settle = settlers.get(id);
    if (!request || !settle) return;
    settlers.delete(id);
    commit(snapshot.queue.filter((item) => item.id !== id));
    settle(resultFor(request.kind, confirmed, value));
  }

  function dismissAll() {
    for (const request of snapshot.queue) resolve(request.id, false);
  }

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => snapshot,
    getServerSnapshot: () => EMPTY,
    open: open as DialogStore["open"],
    resolve,
    dismissAll,
  };
}
