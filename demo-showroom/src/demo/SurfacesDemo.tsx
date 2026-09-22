import { useState } from "react";
import { Button } from "@/components/button";
import {
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Stat,
  trendDirection,
} from "@/components/card";
import {
  Menu,
  MenuCheckboxItem,
  MenuGroup,
  MenuItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuSub,
} from "@/components/menu";
import { Popover } from "@/components/popover";
import { Empty, Skeleton } from "@/components/skeleton";
import { Tooltip } from "@/components/tooltip";

const card =
  "rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950";
const cardTitle = "mb-1 text-sm font-semibold";
const cardNote = "mb-3 text-xs text-zinc-600 dark:text-zinc-400";

const EditIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);
const InboxIcon = () => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 13h4l2 3h4l2-3h4" />
    <path d="M5 5h14l2 8v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4Z" />
  </svg>
);

export function SurfacesDemo() {
  const [compact, setCompact] = useState(false);
  const [sort, setSort] = useState("recent");
  const [lastAction, setLastAction] = useState("—");
  const [lastClose, setLastClose] = useState("—");
  const [loading, setLoading] = useState(false);

  return (
    <div className="flex flex-col gap-6 p-6">
      <section className={card}>
        <h2 className={cardTitle}>Menu</h2>
        <p className={cardNote}>
          Arrow keys wrap, letters jump, submenus open with ArrowRight. Last
          action: {lastAction} · closed by: {lastClose}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Menu
            trigger={<Button variant="outline">Actions</Button>}
            label="Row actions"
            onOpenChange={(open, reason) => {
              if (!open && reason) setLastClose(reason);
            }}
          >
            <MenuItem
              icon={<EditIcon />}
              shortcut="⌘E"
              onSelect={() => setLastAction("Edit")}
            >
              Edit
            </MenuItem>
            <MenuItem onSelect={() => setLastAction("Duplicate")}>
              Duplicate
            </MenuItem>
            <MenuItem disabled onSelect={() => setLastAction("Archive")}>
              Archive
            </MenuItem>
            <MenuSub label="Export">
              <MenuItem onSelect={() => setLastAction("Export CSV")}>
                CSV
              </MenuItem>
              <MenuItem onSelect={() => setLastAction("Export PDF")}>
                PDF
              </MenuItem>
              <MenuSub label="More formats">
                <MenuItem onSelect={() => setLastAction("Export JSON")}>
                  JSON
                </MenuItem>
              </MenuSub>
            </MenuSub>
            <MenuSeparator />
            <MenuCheckboxItem checked={compact} onCheckedChange={setCompact}>
              Compact rows
            </MenuCheckboxItem>
            <MenuRadioGroup
              value={sort}
              onValueChange={setSort}
              label="Sort by"
            >
              <MenuRadioItem value="recent">Most recent</MenuRadioItem>
              <MenuRadioItem value="name">Name</MenuRadioItem>
            </MenuRadioGroup>
            <MenuSeparator />
            <MenuItem destructive onSelect={() => setLastAction("Delete")}>
              Delete
            </MenuItem>
          </Menu>

          <Menu
            trigger={<Button variant="ghost">Aligned to the end</Button>}
            label="Alignment demo"
            align="end"
          >
            <MenuGroup label="Danger zone">
              <MenuItem destructive onSelect={() => setLastAction("Reset")}>
                Reset everything
              </MenuItem>
            </MenuGroup>
          </Menu>
        </div>
      </section>

      <section className={card}>
        <h2 className={cardTitle}>Tooltip and Popover</h2>
        <p className={cardNote}>
          Tooltips describe; popovers hold content you can interact with.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Tooltip content="Export as CSV">
            <Button variant="outline">Hover or focus me</Button>
          </Tooltip>
          <Tooltip content="On the right" side="right">
            <Button variant="ghost">Right side</Button>
          </Tooltip>

          <Popover
            trigger={<Button variant="outline">Filters</Button>}
            title="Filters"
          >
            {({ close }) => (
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" /> Only active
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" /> Has attachments
                </label>
                <Button size="sm" onClick={close} data-autofocus>
                  Apply
                </Button>
              </div>
            )}
          </Popover>
        </div>
      </section>

      <section className={card}>
        <h2 className={cardTitle}>Card and Stat</h2>
        <p className={cardNote}>
          Dashboard tiles, with a trend that never relies on colour alone.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <Card>
            <CardBody>
              <Stat
                label="Revenue"
                value="£48,120"
                trend={{
                  direction: trendDirection(12.4),
                  label: "12.4%",
                  description: "vs last month",
                }}
              />
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <Stat
                label="Churn"
                value="2.1%"
                trend={{
                  direction: trendDirection(0.6),
                  label: "0.6pp",
                  invert: true,
                  description: "vs last month",
                }}
              />
            </CardBody>
          </Card>
          <Card variant="elevated">
            <CardBody>
              <Stat
                label="Open tickets"
                value="34"
                loading={loading}
                help="Updated a minute ago"
              />
            </CardBody>
          </Card>
        </div>

        <div className="mt-3">
          <Card>
            <CardHeader
              title={<h3 className="text-sm font-semibold">Recent activity</h3>}
              description="Everything that happened today"
              actions={
                <Menu
                  trigger={
                    <Button variant="ghost" size="sm">
                      Options
                    </Button>
                  }
                  label="Card options"
                >
                  <MenuItem onSelect={() => setLoading((value) => !value)}>
                    {loading ? "Stop loading" : "Simulate loading"}
                  </MenuItem>
                </Menu>
              }
            />
            <CardBody>
              {loading ? (
                <Skeleton lines={3} label="Loading activity" />
              ) : (
                <Empty
                  size="sm"
                  icon={<InboxIcon />}
                  title="No activity yet"
                  description="Once someone uploads a file, it will show up here."
                  actions={<Button size="sm">Invite your team</Button>}
                />
              )}
            </CardBody>
            <CardFooter>
              <Button variant="ghost" size="sm">
                View all
              </Button>
            </CardFooter>
          </Card>
        </div>
      </section>

      <section className={card}>
        <h2 className={cardTitle}>Skeleton</h2>
        <p className={cardNote}>Placeholders in the shape of what is coming.</p>
        <div className="flex items-start gap-4">
          <Skeleton variant="circle" width={40} />
          <div className="flex-1">
            <Skeleton lines={2} />
          </div>
          <Skeleton variant="rect" width={120} height={60} animation="wave" />
        </div>
      </section>
    </div>
  );
}
