import { describe, expect, it, vi } from "vitest";
import { createDialogApi } from "../core/api";
import { dialog, dialogStore } from "../core/dialog";
import { createDialogStore, resultFor } from "../core/store";

describe("results", () => {
  it("maps an answer to each kind's value", () => {
    expect(resultFor("confirm", true)).toBe(true);
    expect(resultFor("confirm", false)).toBe(false);
    expect(resultFor("prompt", true, "Ada")).toBe("Ada");
    expect(resultFor("prompt", true)).toBe("");
    expect(resultFor("prompt", false, "ignored")).toBeNull();
    expect(resultFor("alert", true)).toBeUndefined();
  });
});

describe("queue", () => {
  it("shows one dialog at a time, in order", async () => {
    const store = createDialogStore();
    const api = createDialogApi(store);

    const first = api.confirm("Delete the file?");
    const second = api.prompt({ title: "Rename", defaultValue: "report.pdf" });
    const [a, b] = store.getSnapshot().queue;
    expect(a).toMatchObject({ kind: "confirm", options: { title: "Delete the file?" } });
    expect(b).toMatchObject({ kind: "prompt", options: { defaultValue: "report.pdf" } });

    store.resolve(a.id, true);
    expect(await first).toBe(true);
    expect(store.getSnapshot().queue.map((item) => item.id)).toEqual([b.id]);

    store.resolve(b.id, true, "summary.pdf");
    expect(await second).toBe("summary.pdf");
    expect(store.getSnapshot().queue).toHaveLength(0);
  });

  it("notifies subscribers and ignores unknown or repeated answers", async () => {
    const store = createDialogStore();
    const listener = vi.fn();
    store.subscribe(listener);

    const answer = store.open("alert", { title: "Saved" });
    const [request] = store.getSnapshot().queue;
    store.resolve("dialog-404", true);
    store.resolve(request.id, true);
    store.resolve(request.id, false);

    expect(await answer).toBeUndefined();
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("cancels everything with dismissAll", async () => {
    const store = createDialogStore();
    const api = createDialogApi(store);
    const results = Promise.all([api.confirm("One?"), api.prompt("Two?"), api.alert("Three")]);

    api.dismissAll();
    expect(await results).toEqual([false, null, undefined]);
    expect(store.getSnapshot().queue).toHaveLength(0);
  });

  it("keeps the snapshot object until something changes", () => {
    const store = createDialogStore();
    const before = store.getSnapshot();
    expect(store.getSnapshot()).toBe(before);
    void store.open("alert", { title: "Hi" });
    expect(store.getSnapshot()).not.toBe(before);
  });
});

describe("where nothing can be shown", () => {
  it("answers as a cancel at once", async () => {
    const store = createDialogStore();
    const api = createDialogApi(store, () => false);
    expect(await api.confirm("Sure?")).toBe(false);
    expect(await api.prompt("Name?")).toBeNull();
    expect(await api.alert("Hi")).toBeUndefined();
    expect(store.getSnapshot().queue).toHaveLength(0);
  });

  it("does so for the default dialog on a server, where there is no document", async () => {
    expect(typeof document).toBe("undefined");
    expect(await dialog.confirm("Rendered on the server")).toBe(false);
    expect(dialogStore.getSnapshot().queue).toHaveLength(0);
  });
});
