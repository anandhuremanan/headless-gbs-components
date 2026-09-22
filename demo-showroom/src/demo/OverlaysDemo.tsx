import { useState } from "react";
import { dialog, DialogHost } from "@/components/dialog";
import { Modal, type ModalPlacement, type ModalSize } from "@/components/modal";

const card =
  "rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950";
const cardTitle = "mb-1 text-sm font-semibold";
const cardNote = "mb-3 text-xs text-zinc-600 dark:text-zinc-400";
const button =
  "rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700";
const field =
  "w-full rounded-md border border-zinc-300 bg-transparent px-2 py-1.5 text-sm dark:border-zinc-700";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function OverlaysDemo() {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <ModalBasics />
        <UnsavedChanges />
        <DialogBasics />
        <AsyncDialogs />
      </div>
      <DialogHost />
    </>
  );
}

function ModalBasics() {
  const [open, setOpen] = useState(false);
  const [size, setSize] = useState<ModalSize>("md");
  const [placement, setPlacement] = useState<ModalPlacement>("center");

  return (
    <section className={card}>
      <h2 className={cardTitle}>Modal</h2>
      <p className={cardNote}>
        A native dialog: the page behind is inert, focus is trapped and returns
        to the button on close. Try drawers and long content.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="Modal size"
          className={button}
          value={size}
          onChange={(event) => setSize(event.target.value as ModalSize)}
        >
          {["sm", "md", "lg", "xl", "full"].map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
        <select
          aria-label="Modal placement"
          className={button}
          value={placement}
          onChange={(event) =>
            setPlacement(event.target.value as ModalPlacement)
          }
        >
          {["center", "top", "left", "right", "bottom"].map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
        <button type="button" className={button} onClick={() => setOpen(true)}>
          Open
        </button>
      </div>

      <Modal
        open={open}
        onOpenChange={setOpen}
        size={size}
        placement={placement}
        title="Terms of service"
        description={`size="${size}" · placement="${placement}"`}
        footer={({ close }) => (
          <>
            <button type="button" className={button} onClick={close}>
              Decline
            </button>
            <button
              type="button"
              className={button}
              data-autofocus
              onClick={close}
            >
              Accept
            </button>
          </>
        )}
      >
        {Array.from({ length: 12 }, (_, index) => (
          <p key={index} className="mb-3">
            {index + 1}. The body scrolls on its own while the header and footer
            stay in place. Escape, the close button and a click on the backdrop
            all close the modal.
          </p>
        ))}
      </Modal>
    </section>
  );
}

function UnsavedChanges() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [saved, setSaved] = useState("");
  const dirty = draft !== saved;

  return (
    <section className={card}>
      <h2 className={cardTitle}>Guarding unsaved changes</h2>
      <p className={cardNote}>
        <code>onBeforeClose</code> asks through the Dialog before throwing edits
        away. The backdrop is locked, so a stray click can't close it.
      </p>
      <div className="flex items-center gap-2">
        <button type="button" className={button} onClick={() => setOpen(true)}>
          Edit note
        </button>
        <span className="truncate text-xs text-zinc-600 dark:text-zinc-400">
          Saved: {saved || "empty"}
        </span>
      </div>

      <Modal
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setDraft(saved);
        }}
        title="Edit note"
        size="sm"
        closeOnBackdrop={false}
        onBeforeClose={(reason) =>
          !dirty ||
          reason === "api" ||
          dialog.confirm({
            title: "Discard your changes?",
            intent: "warning",
            confirmLabel: "Discard",
            cancelLabel: "Keep editing",
          })
        }
        footer={
          <button
            type="button"
            className={button}
            onClick={() => {
              setSaved(draft);
              setOpen(false);
            }}
          >
            Save
          </button>
        }
      >
        <textarea
          className={field}
          rows={4}
          data-autofocus
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Type, then press Escape"
        />
      </Modal>
    </section>
  );
}

function DialogBasics() {
  const [result, setResult] = useState("—");

  return (
    <section className={card}>
      <h2 className={cardTitle}>Dialog</h2>
      <p className={cardNote}>
        <code>await dialog.alert / confirm / prompt</code> from any handler.
        Requests queue and show one at a time.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={button}
          onClick={async () => {
            await dialog.alert({
              title: "Backup complete",
              description: "2,431 files copied.",
              intent: "success",
            });
            setResult("alert closed");
          }}
        >
          Alert
        </button>
        <button
          type="button"
          className={button}
          onClick={async () =>
            setResult(`confirm → ${await dialog.confirm("Leave this page?")}`)
          }
        >
          Confirm
        </button>
        <button
          type="button"
          className={button}
          onClick={async () => {
            const email = await dialog.prompt({
              title: "Invite a teammate",
              inputLabel: "Email",
              inputType: "email",
              placeholder: "name@company.com",
              required: true,
              validate: (value) =>
                /^\S+@\S+\.\S+$/.test(value) ? null : "Enter a valid email",
            });
            setResult(`prompt → ${JSON.stringify(email)}`);
          }}
        >
          Prompt
        </button>
        <button
          type="button"
          className={button}
          onClick={async () => {
            const answers = await Promise.all([
              dialog.confirm("First question?"),
              dialog.confirm("Second question?"),
            ]);
            setResult(`queued → ${answers.join(", ")}`);
          }}
        >
          Two in a row
        </button>
      </div>
      <p className="mt-3 text-xs text-zinc-600 dark:text-zinc-400">
        Result: {result}
      </p>
    </section>
  );
}

let attempts = 0;

function AsyncDialogs() {
  const [log, setLog] = useState<string[]>([]);
  const add = (line: string) =>
    setLog((current) => [line, ...current].slice(0, 4));

  return (
    <section className={card}>
      <h2 className={cardTitle}>Async confirm</h2>
      <p className={cardNote}>
        <code>onConfirm</code> keeps the dialog open with a spinner while it
        runs. Every second attempt fails and shows the error in place, so the
        user can retry.
      </p>
      <button
        type="button"
        className={button}
        onClick={async () => {
          const deleted = await dialog.confirm({
            title: "Delete project “Atlas”?",
            description: "All 18 boards and their history will be removed.",
            intent: "danger",
            confirmLabel: "Delete project",
            onConfirm: async () => {
              await wait(1000);
              attempts += 1;
              if (attempts % 2 === 0)
                throw new Error("The server didn't respond. Try again.");
            },
          });
          add(deleted ? "Project deleted" : "Kept the project");
        }}
      >
        Delete project
      </button>
      <ul className="mt-3 space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
        {log.map((line, index) => (
          <li key={index}>{line}</li>
        ))}
      </ul>
    </section>
  );
}
