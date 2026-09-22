import { useState } from "react";
import { Breadcrumb, type BreadcrumbItem } from "@/components/breadcrumb";
import { Button } from "@/components/button";
import { Checkbox, CheckboxGroup } from "@/components/checkbox";
import { Spinner } from "@/components/spinner";
import { Tab, TabList, TabPanel, Tabs } from "@/components/tabs";

const card =
  "rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950";
const cardTitle = "mb-1 text-sm font-semibold";
const cardNote = "mb-3 text-xs text-zinc-600 dark:text-zinc-400";

const wait = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const PlusIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <path d="M12 5v14M5 12h14" />
  </svg>
);
const TrashIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
  </svg>
);
const HomeIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 11 12 4l9 7M5 10v10h14V10" />
  </svg>
);

export function ControlsDemo() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Buttons />
      <Spinners />
      <Checkboxes />
      <TabsCard />
      <Breadcrumbs />
    </div>
  );
}

function Buttons() {
  const [saves, setSaves] = useState(0);
  const [loading, setLoading] = useState(false);

  return (
    <section className={card}>
      <h2 className={cardTitle}>Button</h2>
      <p className={cardNote}>
        An async <code>onClick</code> shows the spinner on its own and keeps the
        button's width and focus.
      </p>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger" leading={<TrashIcon />}>
            Delete
          </Button>
          <Button variant="link">Link</Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" leading={<PlusIcon />}>
            Small
          </Button>
          <Button size="md" variant="outline">
            Medium
          </Button>
          <Button size="lg" variant="outline">
            Large
          </Button>
          <Button variant="outline" icon={<PlusIcon />} aria-label="Add item" />
          <Button disabled>Disabled</Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={async () => {
              await wait(1500);
              setSaves((count) => count + 1);
            }}
          >
            Save changes
          </Button>
          <Button
            variant="outline"
            loading={loading}
            loadingText="Syncing…"
            onClick={() => setLoading((value) => !value)}
          >
            Toggle loading
          </Button>
          <Button
            variant="secondary"
            render={(props) => <a href="#controls" {...props} />}
          >
            Rendered as a link
          </Button>
          <span className="text-xs text-zinc-600 dark:text-zinc-400">
            Saved {saves}×
          </span>
        </div>
        <Button variant="outline" fullWidth onClick={() => wait(1200)}>
          Full width
        </Button>
      </div>
    </section>
  );
}

function Spinners() {
  const [loading, setLoading] = useState(false);

  return (
    <section className={card}>
      <h2 className={cardTitle}>Spinner</h2>
      <p className={cardNote}>
        Sizes, variants and labels, and a spinner covering busy content. It
        waits 250&nbsp;ms before appearing and then stays at least 600&nbsp;ms,
        so fast reloads don't flicker.
      </p>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-5">
          <Spinner size="xs" />
          <Spinner size="sm" />
          <Spinner />
          <Spinner size="lg" className="text-blue-600 dark:text-blue-400" />
          <Spinner size="xl" variant="dots" />
          <Spinner size="sm" showLabel label="Saving draft…" />
        </div>
        <Spinner
          loading={loading}
          delay={250}
          minDuration={600}
          className="rounded-lg"
        >
          <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <p className="mb-2 text-sm font-medium">Quarterly revenue</p>
            <p className="text-2xl font-semibold">$48,210</p>
            <button
              type="button"
              className="mt-3 text-xs text-blue-600 underline dark:text-blue-400"
            >
              View report (inert while loading)
            </button>
          </div>
        </Spinner>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              setLoading(true);
              await wait(1800);
              setLoading(false);
            }}
          >
            Reload (1.8 s)
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={async () => {
              setLoading(true);
              await wait(120);
              setLoading(false);
            }}
          >
            Quick reload (120 ms, no flash)
          </Button>
        </div>
      </div>
    </section>
  );
}

const CHANNELS = [
  { value: "email", label: "Email", description: "Daily digest" },
  { value: "sms", label: "SMS", description: "Urgent alerts only" },
  { value: "push", label: "Push", description: "Mobile app" },
  {
    value: "slack",
    label: "Slack",
    description: "Needs an admin to connect",
    disabled: true,
  },
];

function Checkboxes() {
  const [agreed, setAgreed] = useState(false);
  const [channels, setChannels] = useState<string[]>(["email"]);

  return (
    <section className={card}>
      <h2 className={cardTitle}>Checkbox</h2>
      <p className={cardNote}>
        Native inputs, styled. The group has a select-all box with a mixed
        state.
      </p>
      <div className="flex flex-col gap-5">
        <Checkbox
          label="I agree to the terms"
          description="Required to create an account."
          checked={agreed}
          onCheckedChange={setAgreed}
          required
          error={agreed ? undefined : "Please accept the terms to continue."}
        />
        <CheckboxGroup
          label="Notify me by"
          options={CHANNELS}
          value={channels}
          onValueChange={setChannels}
          selectAll
          description={`Selected: ${channels.join(", ") || "none"}`}
        />
        <CheckboxGroup
          label="Size"
          orientation="horizontal"
          defaultValue={["md"]}
          size="sm"
        >
          <Checkbox value="sm" label="Small" />
          <Checkbox value="md" label="Medium" />
          <Checkbox value="lg" label="Large" />
        </CheckboxGroup>
      </div>
    </section>
  );
}

function TabsCard() {
  const [variant, setVariant] = useState<"line" | "pills" | "enclosed">("line");

  return (
    <section className={card}>
      <h2 className={cardTitle}>Tabs</h2>
      <p className={cardNote}>
        Arrow keys move and select, Home/End jump, disabled tabs are skipped.
        The form tab keeps its input when you switch away (
        <code>keepMounted</code> with React's Activity).
      </p>
      <div className="flex flex-col gap-6">
        <Tabs defaultValue="overview" variant={variant} keepMounted>
          <TabList aria-label="Project">
            <Tab value="overview">Overview</Tab>
            <Tab value="activity" badge={12}>
              Activity
            </Tab>
            <Tab value="settings">Settings</Tab>
            <Tab value="billing" disabled>
              Billing
            </Tab>
          </TabList>
          <TabPanel value="overview" className="text-sm">
            <p>Switch the look:</p>
            <div className="mt-2 flex gap-2">
              {(["line", "pills", "enclosed"] as const).map((option) => (
                <Button
                  key={option}
                  size="sm"
                  variant={option === variant ? "primary" : "outline"}
                  onClick={() => setVariant(option)}
                >
                  {option}
                </Button>
              ))}
            </div>
          </TabPanel>
          <TabPanel value="activity" className="text-sm">
            12 new events since yesterday.
          </TabPanel>
          <TabPanel value="settings" className="text-sm">
            <label className="flex flex-col gap-1">
              Project name
              <input
                className="rounded-md border border-zinc-300 bg-transparent px-2 py-1 dark:border-zinc-700"
                defaultValue="Atlas"
              />
            </label>
          </TabPanel>
        </Tabs>

        <Tabs
          defaultValue="general"
          orientation="vertical"
          variant="pills"
          activation="manual"
          size="sm"
        >
          <TabList aria-label="Account settings">
            <Tab value="general">General</Tab>
            <Tab value="security">Security</Tab>
            <Tab value="notifications">Notifications</Tab>
          </TabList>
          <TabPanel value="general" className="text-sm">
            Vertical, manual activation: arrows move focus, Enter selects.
          </TabPanel>
          <TabPanel value="security" className="text-sm">
            Two-factor authentication is on.
          </TabPanel>
          <TabPanel value="notifications" className="text-sm">
            Email digests are weekly.
          </TabPanel>
        </Tabs>
      </div>
    </section>
  );
}

const TRAIL: BreadcrumbItem[] = [
  { label: "Home", href: "#", icon: <HomeIcon /> },
  { label: "Workspaces", href: "#" },
  { label: "Grampro", href: "#" },
  { label: "Finance", href: "#" },
  { label: "Invoices", href: "#" },
  { label: "INV-2026-0042 — Quarterly retainer for design services" },
];

function Breadcrumbs() {
  return (
    <section className={card}>
      <h2 className={cardTitle}>Breadcrumb</h2>
      <p className={cardNote}>
        A long trail collapses to its ends; the ellipsis reveals the rest and
        moves focus to it. Long labels are cut with a tooltip.
      </p>
      <div className="flex flex-col gap-4">
        <Breadcrumb items={TRAIL} />
        <Breadcrumb items={TRAIL} maxItems={4} itemsAfterCollapse={2} />
        <Breadcrumb items={TRAIL.slice(0, 3)} separator="/" size="sm" />
      </div>
    </section>
  );
}
