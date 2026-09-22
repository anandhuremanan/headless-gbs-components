import { useState } from "react";
import {
  toast,
  Toaster,
  type ToastPosition,
} from "../../../source/beta-components/toaster";

const card = "rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950";
const cardTitle = "mb-1 text-sm font-semibold";
const cardNote = "mb-3 text-xs text-zinc-600 dark:text-zinc-400";
const button = "rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700";

const POSITIONS: ToastPosition[] = [
  "top-left",
  "top-center",
  "top-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
];

// These live outside React on purpose: `toast()` needs no hook, context or provider.
let attempt = 0;

function saveSettings() {
  attempt += 1;
  const fails = attempt % 2 === 0;
  return new Promise<{ name: string }>((resolve, reject) =>
    setTimeout(
      () => (fails ? reject(new Error("Network timeout")) : resolve({ name: "Profile" })),
      1500,
    ),
  );
}

function simulateUpload() {
  const id = toast.loading("Uploading report.pdf", { description: "0%" });
  let percent = 0;
  const timer = setInterval(() => {
    percent += 20;
    if (percent < 100) {
      toast.update(id, { description: `${percent}%` });
      return;
    }
    clearInterval(timer);
    toast.update(id, { type: "success", title: "report.pdf uploaded", description: "2.4 MB" });
  }, 400);
}

export function ToasterDemo() {
  const [position, setPosition] = useState<ToastPosition>("top-right");
  const [limit, setLimit] = useState(3);
  const [closeButton, setCloseButton] = useState(true);

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <section className={card}>
          <h2 className={cardTitle}>Types</h2>
          <p className={cardNote}>
            Hover a toast to pause its timer. Press Alt+T to focus the notifications, Escape to
            dismiss one, or swipe it away.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={button}
              onClick={() => toast("Event created", { description: "Monday, 16 September at 10:00" })}
            >
              Default
            </button>
            <button type="button" className={button} onClick={() => toast.success("Settings saved")}>
              Success
            </button>
            <button
              type="button"
              className={button}
              onClick={() => toast.error("Payment declined", { description: "The card was refused." })}
            >
              Error
            </button>
            <button
              type="button"
              className={button}
              onClick={() => toast.warning("Storage almost full", { description: "92% of 10 GB used" })}
            >
              Warning
            </button>
            <button type="button" className={button} onClick={() => toast.info("A new version is available")}>
              Info
            </button>
            <button
              type="button"
              className={button}
              onClick={() => toast.loading("Syncing…", { id: "sync" })}
            >
              Loading (stays)
            </button>
          </div>
        </section>

        <section className={card}>
          <h2 className={cardTitle}>Actions, promises and updates</h2>
          <p className={cardNote}>
            The promise alternates between success and failure. The upload updates one toast in place.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={button}
              onClick={() =>
                toast("Message archived", {
                  action: { label: "Undo", onClick: () => toast.success("Message restored") },
                })
              }
            >
              Undo action
            </button>
            <button
              type="button"
              className={button}
              onClick={() =>
                toast.error("Could not connect", {
                  id: "connect",
                  duration: Infinity,
                  cancel: { label: "Dismiss", onClick: () => {} },
                  action: {
                    label: "Retry",
                    onClick: (event) => {
                      // Keep this toast open and turn it into progress.
                      event.preventDefault();
                      toast.update("connect", {
                        type: "loading",
                        title: "Reconnecting…",
                        action: undefined,
                        cancel: undefined,
                      });
                      setTimeout(
                        () => toast.update("connect", { type: "success", title: "Connected" }),
                        1200,
                      );
                    },
                  },
                })
              }
            >
              Retry + cancel
            </button>
            <button
              type="button"
              className={button}
              onClick={() =>
                toast.promise(saveSettings, {
                  loading: "Saving profile…",
                  success: (result) => `${result.name} saved`,
                  error: (error) => `Could not save: ${(error as Error).message}`,
                })
              }
            >
              Promise
            </button>
            <button type="button" className={button} onClick={simulateUpload}>
              Upload progress
            </button>
          </div>
        </section>

        <section className={card}>
          <h2 className={cardTitle}>Placement and queueing</h2>
          <p className={cardNote}>
            Toasts beyond the limit wait with their timers held and appear as others close.
          </p>
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-xs text-zinc-600 dark:text-zinc-400" htmlFor="toast-position">
                Position
              </label>
              <select
                id="toast-position"
                className={button}
                value={position}
                onChange={(event) => setPosition(event.target.value as ToastPosition)}
              >
                {POSITIONS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
              <label className="text-xs text-zinc-600 dark:text-zinc-400" htmlFor="toast-limit">
                Limit
              </label>
              <select
                id="toast-limit"
                className={button}
                value={limit}
                onChange={(event) => setLimit(Number(event.target.value))}
              >
                {[1, 3, 5].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-1 text-sm">
                <input
                  type="checkbox"
                  checked={closeButton}
                  onChange={(event) => setCloseButton(event.target.checked)}
                />
                Close button
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={button}
                onClick={() => {
                  for (let i = 1; i <= 6; i++) toast(`Notification ${i}`, { description: "Queued" });
                }}
              >
                Show six
              </button>
              <button
                type="button"
                className={button}
                onClick={() => toast("Stays until you close it", { duration: Infinity })}
              >
                Sticky
              </button>
              <button type="button" className={button} onClick={() => toast.dismiss()}>
                Dismiss all
              </button>
            </div>
          </div>
        </section>

        <section className={card}>
          <h2 className={cardTitle}>Custom content</h2>
          <p className={cardNote}>Render any content; the toast still handles timing, swipe and Escape.</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={button}
              onClick={() =>
                toast.custom(
                  ({ dismiss }) => (
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 place-items-center rounded-full bg-zinc-200 text-sm font-semibold dark:bg-zinc-800">
                        AK
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold">Aarav Kim</div>
                        <div className="text-zinc-600 dark:text-zinc-400">Invited you to “Q3 planning”</div>
                      </div>
                      <button type="button" className={button} onClick={dismiss}>
                        View
                      </button>
                    </div>
                  ),
                  { duration: 8000 },
                )
              }
            >
              Custom card
            </button>
            <button
              type="button"
              className={button}
              onClick={() => toast("Party time", { icon: <span aria-hidden="true">🎉</span> })}
            >
              Custom icon
            </button>
          </div>
        </section>
      </div>

      <Toaster position={position} limit={limit} closeButton={closeButton} />
    </>
  );
}
