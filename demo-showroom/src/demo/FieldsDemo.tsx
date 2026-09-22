import { useState } from "react";
import { Input, OtpInput } from "../../../source/beta-components/input";
import { Textarea } from "../../../source/beta-components/textarea";

const card =
  "rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950";
const cardTitle = "mb-1 text-sm font-semibold";
const cardNote = "mb-3 text-xs text-zinc-600 dark:text-zinc-400";
const button =
  "rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700";

const SearchIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden="true"
  >
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

export function FieldsDemo() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <TextInputs />
      <OtpFields />
      <TextareaFields />
      <NativeForm />
    </div>
  );
}

function TextInputs() {
  const [query, setQuery] = useState("");
  const [username, setUsername] = useState("ada");
  const taken = ["admin", "root", "support"].includes(username.toLowerCase());

  return (
    <section className={card}>
      <h2 className={cardTitle}>Input</h2>
      <p className={cardNote}>
        Adornments, clear button, password reveal, counters, sizes and states.
      </p>
      <div className="flex flex-col gap-4">
        <Input
          label="Search"
          type="search"
          leading={<SearchIcon />}
          clearable
          value={query}
          onValueChange={setQuery}
          placeholder="Orders, customers…"
        />
        <Input
          label="Username"
          value={username}
          onValueChange={setUsername}
          required
          maxLength={20}
          showCount
          error={taken ? `“${username}” is taken` : undefined}
          description="Try “admin” to see the error state."
        />
        <Input
          label="Password"
          type="password"
          autoComplete="new-password"
          required
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Weight"
            type="number"
            trailing="kg"
            size="sm"
            defaultValue="72"
          />
          <Input
            label="Website"
            size="sm"
            leading="https://"
            placeholder="example.com"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Disabled" disabled defaultValue="Can't touch this" />
          <Input label="Read-only" readOnly defaultValue="INV-2026-0042" />
        </div>
      </div>
    </section>
  );
}

function OtpFields() {
  const [code, setCode] = useState("");
  const [state, setState] = useState<"idle" | "checking" | "ok" | "wrong">(
    "idle",
  );

  return (
    <section className={card}>
      <h2 className={cardTitle}>One-time codes</h2>
      <p className={cardNote}>
        One real input drawn as cells: paste “Your code is 123-456”, use SMS
        autofill on a phone, or type. Arrow keys move between filled cells.
      </p>
      <div className="flex flex-col gap-5">
        <OtpInput
          label="SMS code"
          groups={[3, 3]}
          value={code}
          onValueChange={(next) => {
            setCode(next);
            setState("idle");
          }}
          onComplete={(next) => {
            setState("checking");
            setTimeout(() => setState(next === "123456" ? "ok" : "wrong"), 600);
          }}
          disabled={state === "checking"}
          error={
            state === "wrong"
              ? "Wrong code. The demo code is 123456."
              : undefined
          }
          description={
            state === "checking"
              ? "Checking…"
              : state === "ok"
                ? "Verified ✓"
                : "The demo code is 123456."
          }
        />
        <OtpInput
          label="Backup code"
          length={8}
          mode="alphanumeric"
          uppercase
          groups={[4, 4]}
          size="sm"
        />
        <OtpInput label="PIN" length={4} mask size="lg" />
        <button
          type="button"
          className={`${button} self-start`}
          onClick={() => {
            setCode("");
            setState("idle");
          }}
        >
          Reset
        </button>
      </div>
    </section>
  );
}

function TextareaFields() {
  const [bio, setBio] = useState("");

  return (
    <section className={card}>
      <h2 className={cardTitle}>Textarea</h2>
      <p className={cardNote}>
        Auto-resize uses CSS <code>field-sizing</code> where the browser
        supports it and measures otherwise. Counts treat emoji as one character.
      </p>
      <div className="flex flex-col gap-4">
        <Textarea
          label="Bio"
          value={bio}
          onValueChange={setBio}
          autoResize
          minRows={2}
          maxRows={6}
          maxLength={160}
          showCount
          placeholder="Grows as you type 👍🏽"
        />
        <Textarea
          label="Internal notes"
          rows={4}
          resize="both"
          description="Drag the corner to resize."
        />
        <Textarea
          label="Error state"
          defaultValue="Too short"
          error="Write at least 20 characters."
          size="sm"
        />
      </div>
    </section>
  );
}

function NativeForm() {
  const [posted, setPosted] = useState<string | null>(null);

  return (
    <section className={card}>
      <h2 className={cardTitle}>Plain form</h2>
      <p className={cardNote}>
        Props pass straight to the native elements, so <code>name</code>,{" "}
        <code>required</code> and <code>pattern</code> work with FormData and
        the browser's validation.
      </p>
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          setPosted(
            JSON.stringify(
              Object.fromEntries(new FormData(event.currentTarget)),
            ),
          );
        }}
      >
        <Input label="Company" name="company" required />
        <OtpInput label="Access code" name="code" length={4} required />
        <Textarea label="Message" name="message" autoResize minRows={2} />
        <div className="flex items-center gap-2">
          <button type="submit" className={button}>
            Submit
          </button>
          <code className="break-all text-xs text-zinc-600 dark:text-zinc-400">
            {posted ?? "not submitted"}
          </code>
        </div>
      </form>
    </section>
  );
}
