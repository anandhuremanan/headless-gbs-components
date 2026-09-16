import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createToastApi } from "../core/api";
import { createToastStore, visibleToasts, type ToastStore } from "../core/store";
import { toast, toastStore } from "../core/toast";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

const states = (store: ToastStore) =>
  store.getSnapshot().toasts.map((item) => `${item.id}:${item.state}`);

const find = (store: ToastStore, id: string) =>
  store.getSnapshot().toasts.find((item) => item.id === id);

describe("showing", () => {
  it("adds toasts newest first, with defaults", () => {
    const store = createToastStore();
    const first = store.show("Saved");
    const second = store.show("Deleted", { type: "error", description: "3 rows" });

    expect([first, second]).toEqual(["toast-1", "toast-2"]);
    const [newest, oldest] = store.getSnapshot().toasts;
    expect(newest).toMatchObject({ id: "toast-2", type: "error", description: "3 rows" });
    expect(oldest).toMatchObject({
      title: "Saved",
      type: "default",
      duration: 5000,
      dismissible: true,
      state: "open",
      version: 1,
    });
  });

  it("updates a toast shown again with the same id, keeping its place", () => {
    const store = createToastStore();
    store.show("Syncing", { id: "sync" });
    store.show("Other");
    store.show("Synced", { id: "sync", type: "success" });

    expect(states(store)).toEqual(["toast-1:open", "sync:open"]);
    expect(find(store, "sync")).toMatchObject({ title: "Synced", type: "success", version: 2 });
  });

  it("restarts the countdown when the same id is shown again", () => {
    const store = createToastStore();
    store.show("Draft saved", { id: "draft" });
    vi.advanceTimersByTime(4000);
    store.show("Draft saved again", { id: "draft" });
    vi.advanceTimersByTime(4000);
    expect(find(store, "draft")?.state).toBe("open");
    vi.advanceTimersByTime(1000);
    expect(find(store, "draft")?.state).toBe("closing");
  });

  it("brings back a toast that is fading out instead of stacking a copy", () => {
    const store = createToastStore();
    store.show("Offline", { id: "net" });
    store.dismiss("net");
    store.show("Still offline", { id: "net" });
    vi.advanceTimersByTime(300);
    expect(states(store)).toEqual(["net:open"]);
  });
});

describe("timing", () => {
  it("closes after its duration, then leaves after the exit animation", () => {
    const store = createToastStore();
    const onAutoClose = vi.fn();
    const onDismiss = vi.fn();
    store.show("Saved", { duration: 2000, onAutoClose, onDismiss });

    vi.advanceTimersByTime(1999);
    expect(states(store)).toEqual(["toast-1:open"]);
    vi.advanceTimersByTime(1);
    expect(states(store)).toEqual(["toast-1:closing"]);
    expect(onAutoClose).toHaveBeenCalledOnce();
    expect(onDismiss).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200);
    expect(states(store)).toEqual([]);
  });

  it("keeps sticky and loading toasts until dismissed", () => {
    const store = createToastStore();
    store.show("Zero", { duration: 0 });
    store.show("Infinite", { duration: Infinity });
    store.show("Working", { type: "loading" });

    vi.advanceTimersByTime(60_000);
    expect(states(store)).toEqual(["toast-3:open", "toast-2:open", "toast-1:open"]);
    expect(find(store, "toast-1")?.duration).toBe(Infinity);
  });

  it("dismisses one toast or all of them", () => {
    const store = createToastStore();
    const onDismiss = vi.fn();
    store.show("A", { onDismiss });
    store.show("B");
    store.show("C");

    store.dismiss("toast-1");
    expect(onDismiss).toHaveBeenCalledWith(expect.objectContaining({ id: "toast-1" }));
    expect(states(store)).toEqual(["toast-3:open", "toast-2:open", "toast-1:closing"]);

    store.dismiss();
    vi.advanceTimersByTime(200);
    expect(states(store)).toEqual([]);
  });

  it("holds the remaining time while paused", () => {
    const store = createToastStore();
    store.show("Saved");

    vi.advanceTimersByTime(3000);
    store.pause();
    vi.advanceTimersByTime(10_000);
    expect(states(store)).toEqual(["toast-1:open"]);

    store.resume();
    vi.advanceTimersByTime(1999);
    expect(states(store)).toEqual(["toast-1:open"]);
    vi.advanceTimersByTime(1);
    expect(states(store)).toEqual(["toast-1:closing"]);
  });

  it("queues toasts beyond the limit with their full time", () => {
    const store = createToastStore({ limit: 3 });
    for (const title of ["A", "B", "C", "D"]) store.show(title);

    expect(visibleToasts(store.getSnapshot()).map((item) => item.title)).toEqual(["D", "C", "B"]);

    // B, C and D run out; A only starts counting once it gets a slot.
    vi.advanceTimersByTime(5000);
    expect(find(store, "toast-1")?.state).toBe("open");
    expect(visibleToasts(store.getSnapshot()).map((item) => item.title)).toEqual([
      "D",
      "C",
      "B",
      "A",
    ]);
    vi.advanceTimersByTime(4999);
    expect(find(store, "toast-1")?.state).toBe("open");
    vi.advanceTimersByTime(1);
    expect(find(store, "toast-1")?.state).toBe("closing");
  });
});

describe("updates", () => {
  it("gives a loading toast a normal duration once its type changes", () => {
    const store = createToastStore();
    const id = store.show("Uploading", { type: "loading" });

    store.update(id, { description: "40%" });
    expect(find(store, id)).toMatchObject({ duration: Infinity, description: "40%", version: 2 });

    store.update(id, { type: "success", title: "Uploaded" });
    expect(find(store, id)).toMatchObject({ type: "success", title: "Uploaded", duration: 5000 });
    vi.advanceTimersByTime(5000);
    expect(find(store, id)?.state).toBe("closing");
  });

  it("ignores ids that are not open", () => {
    const store = createToastStore();
    store.update("missing", { title: "Nope" });
    expect(states(store)).toEqual([]);
  });

  it("applies a new limit and notifies subscribers", () => {
    const store = createToastStore();
    const listener = vi.fn();
    store.subscribe(listener);

    store.configure({ limit: 1, duration: undefined });
    expect(store.getSnapshot().limit).toBe(1);
    expect(listener).toHaveBeenCalledOnce();

    store.pause();
    store.pause();
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("keeps the same snapshot object until something changes", () => {
    const store = createToastStore();
    const before = store.getSnapshot();
    expect(store.getSnapshot()).toBe(before);
    store.show("Hi");
    expect(store.getSnapshot()).not.toBe(before);
  });
});

describe("toast api", () => {
  it("sets the type from the shortcut used", () => {
    const store = createToastStore();
    const api = createToastApi(store);
    api.success("Saved");
    api.warning("Low disk");
    api.custom(({ id }) => id);

    const [custom, warning, success] = store.getSnapshot().toasts;
    expect(success.type).toBe("success");
    expect(warning.type).toBe("warning");
    expect(typeof custom.render).toBe("function");
  });

  it("turns a promise into a success toast", async () => {
    const store = createToastStore();
    const api = createToastApi(store);
    const result = api.promise(Promise.resolve(42), {
      loading: "Saving",
      success: (value) => `Saved ${value}`,
      error: "Failed",
    });

    expect(store.getSnapshot().toasts[0]).toMatchObject({ type: "loading", title: "Saving" });
    await expect(result).resolves.toBe(42);
    expect(store.getSnapshot().toasts[0]).toMatchObject({ type: "success", title: "Saved 42" });
  });

  it("turns a rejected promise into an error toast and still rejects", async () => {
    const store = createToastStore();
    const api = createToastApi(store);
    const result = api.promise(() => Promise.reject(new Error("Network down")), {
      loading: "Saving",
      error: (error) => (error as Error).message,
    });

    await expect(result).rejects.toThrow("Network down");
    expect(store.getSnapshot().toasts[0]).toMatchObject({ type: "error", title: "Network down" });
  });

  it("closes quietly when a promise message is left out", async () => {
    const store = createToastStore();
    const api = createToastApi(store);
    await api.promise(Promise.resolve("ok"), { loading: "Checking" });
    expect(states(store)).toEqual(["toast-1:closing"]);
  });

  it("does nothing where a toast cannot be shown", async () => {
    const store = createToastStore();
    const api = createToastApi(store, () => false);
    expect(api("Hidden")).toBe("");
    expect(api.success("Hidden", { id: "kept" })).toBe("kept");
    await expect(api.promise(Promise.resolve(1), { loading: "…" })).resolves.toBe(1);
    expect(states(store)).toEqual([]);
  });

  it("ignores the default toast() on a server, where there is no document", () => {
    expect(typeof document).toBe("undefined");
    expect(toast("Rendered on the server")).toBe("");
    expect(toastStore.getSnapshot().toasts).toHaveLength(0);
  });
});
