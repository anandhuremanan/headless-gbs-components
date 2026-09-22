import { useEffect, useState } from "react";
import { Accordion, AccordionItem } from "../../../source/beta-components/accordion";
import { Alert } from "../../../source/beta-components/alert";
import { Avatar, AvatarGroup } from "../../../source/beta-components/avatar";
import { Badge, Tag } from "../../../source/beta-components/badge";
import { Button } from "../../../source/beta-components/button";
import { CircularProgress, Progress } from "../../../source/beta-components/progress";

const card = "rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950";
const cardTitle = "mb-1 text-sm font-semibold";
const cardNote = "mb-3 text-xs text-zinc-600 dark:text-zinc-400";

export function DisplayDemo() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Alerts />
      <Badges />
      <Avatars />
      <Progresses />
      <Accordions />
    </div>
  );
}

function Alerts() {
  const [shown, setShown] = useState(true);

  return (
    <section className={card}>
      <h2 className={cardTitle}>Alert</h2>
      <p className={cardNote}>
        Stays in the page: neither interrupting like a dialog nor leaving like a toast.
      </p>
      <div className="flex flex-col gap-3">
        <Alert variant="info" title="Read-only workspace">
          You have view access to this project. Ask an owner for edit rights.
        </Alert>
        <Alert variant="warning" title="Your trial ends in 3 days" actions={<Button size="sm">Add a card</Button>}>
          After that the workspace becomes read-only.
        </Alert>
        {shown && (
          <Alert variant="danger" title="We could not save your changes" onDismiss={() => setShown(false)}>
            The connection dropped. Your edits are still here.
          </Alert>
        )}
        <Alert variant="success" size="sm">
          240 rows imported.
        </Alert>
        <Alert variant="neutral" size="sm" icon={false}>
          No icon, no colour: a plain note.
        </Alert>
      </div>
    </section>
  );
}

function Badges() {
  const [tags, setTags] = useState(["Berlin", "Paris", "Rome"]);

  return (
    <section className={card}>
      <h2 className={cardTitle}>Badge and Tag</h2>
      <p className={cardNote}>A badge is text; a tag comes off. Counts stop at max and say so aloud.</p>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="success">Active</Badge>
          <Badge variant="warning" dot>
            Degraded
          </Badge>
          <Badge variant="danger" appearance="solid">
            Failed
          </Badge>
          <Badge variant="accent" appearance="outline">
            Beta
          </Badge>
          <Badge>Draft</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge count={3} variant="danger" appearance="solid" />
          <Badge count={128} variant="danger" appearance="solid" />
          <Badge count={0} showZero />
          <Badge count={0} />
          <span className="text-xs text-zinc-500">← a zero with no showZero renders nothing</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {tags.map((tag) => (
            <Tag key={tag} onRemove={() => setTags((current) => current.filter((item) => item !== tag))}>
              {tag}
            </Tag>
          ))}
          {tags.length === 0 && <span className="text-xs text-zinc-500">All removed.</span>}
        </div>
      </div>
    </section>
  );
}

const PEOPLE = ["Ada Lovelace", "Grace Hopper", "Alan Turing", "Katherine Johnson", "Edsger Dijkstra"];

function Avatars() {
  return (
    <section className={card}>
      <h2 className={cardTitle}>Avatar</h2>
      <p className={cardNote}>
        The colour is a hash of the name, so the same person is always the same colour.
      </p>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {PEOPLE.slice(0, 4).map((name) => (
            <Avatar key={name} name={name} />
          ))}
          <Avatar name="Ada Lovelace" src="https://example.invalid/missing.png" />
          <span className="text-xs text-zinc-500">← a broken image falls back to initials</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Avatar name="Ada Lovelace" size="xs" />
          <Avatar name="Grace Hopper" size="sm" status="online" />
          <Avatar name="Alan Turing" status="busy" />
          <Avatar name="Katherine Johnson" size="lg" shape="square" status="away" />
          <Avatar name="Edsger Dijkstra" size="xl" />
        </div>
        <AvatarGroup label="Assigned to" max={4}>
          {PEOPLE.map((name) => (
            <Avatar key={name} name={name} />
          ))}
        </AvatarGroup>
      </div>
    </section>
  );
}

function Progresses() {
  const [value, setValue] = useState(18);

  useEffect(() => {
    const timer = setInterval(() => setValue((current) => (current >= 100 ? 0 : current + 2)), 240);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className={card}>
      <h2 className={cardTitle}>Progress</h2>
      <p className={cardNote}>A known end. Use the Spinner when there is nothing to measure.</p>
      <div className="flex flex-col gap-4">
        <Progress label="Uploading report.pdf" value={value} showValue />
        <Progress label="Storage" value={92} showValue valueText="9.2 GB of 10 GB" variant="warning" size="sm" />
        <Progress label="Preparing export" value={null} />
        <div className="flex items-center gap-4">
          <CircularProgress value={value} showValue />
          <CircularProgress value={72} size={56} thickness={6} variant="success" showValue />
          <CircularProgress value={null} size={28} />
        </div>
      </div>
    </section>
  );
}

function Accordions() {
  return (
    <section className={card}>
      <h2 className={cardTitle}>Accordion</h2>
      <p className={cardNote}>
        Native &lt;details&gt;: Enter and Space work, and Ctrl+F finds text in a closed panel.
      </p>
      <div className="flex flex-col gap-4">
        <Accordion
          defaultValue={["shipping"]}
          items={[
            { value: "shipping", title: "Shipping", content: <p>Two to five working days.</p> },
            { value: "returns", title: "Returns", description: "Thirty days", content: <p>No questions asked.</p> },
            { value: "support", title: "Support", content: <p>We answer within a day.</p>, disabled: true },
          ]}
        />
        <Accordion multiple variant="contained" size="sm" iconPosition="start">
          <AccordionItem value="a" title="Filters" meta={<Badge count={3} />}>
            <p>Several can be open at once here.</p>
          </AccordionItem>
          <AccordionItem value="b" title="Columns">
            <p>And closing them all is allowed.</p>
          </AccordionItem>
        </Accordion>
      </div>
    </section>
  );
}
