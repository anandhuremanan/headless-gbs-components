import { useState } from "react";
import { NumberInput } from "@/components/number-input";
import { RadioGroup, Radio } from "@/components/radio-group";
import { Switch } from "@/components/switch";

const card =
  "rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950";
const cardTitle = "mb-1 text-sm font-semibold";
const cardNote = "mb-3 text-xs text-zinc-600 dark:text-zinc-400";

const wait = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export function FormControlsDemo() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Switches />
      <Radios />
      <Cards />
      <Numbers />
      <Money />
    </div>
  );
}

function Switches() {
  const [digest, setDigest] = useState(true);
  const [failing, setFailing] = useState(false);

  return (
    <section className={card}>
      <h2 className={cardTitle}>Switch</h2>
      <p className={cardNote}>
        Settings that take effect at once. The second one saves to a pretend
        server; the third always fails and puts itself back.
      </p>
      <div className="flex flex-col gap-3">
        <Switch label="Email notifications" defaultChecked />
        <Switch
          label="Two-factor authentication"
          description="Ask for a code from your authenticator app."
          checked={digest}
          onCheckedChange={async (next) => {
            await wait(900);
            setDigest(next);
          }}
        />
        <Switch
          label="Sync with the billing system"
          description="This one rejects, so watch it return to where it was."
          checked={failing}
          onCheckedChange={async () => {
            await wait(900);
            setFailing(false);
            throw new Error("nope");
          }}
        />
        <Switch
          label="Weekly digest"
          labelPosition="start"
          defaultChecked
          size="sm"
        />
        <Switch label="Read-only, on" checked readOnly />
        <Switch label="Disabled" disabled />
      </div>
    </section>
  );
}

function Radios() {
  const [frequency, setFrequency] = useState<string | null>("Weekly");

  return (
    <section className={card}>
      <h2 className={cardTitle}>RadioGroup</h2>
      <p className={cardNote}>
        Native radios: one tab stop, arrows move between them. Clearable,
        because a radio cannot be unselected.
      </p>
      <div className="flex flex-col gap-4">
        <RadioGroup
          label="Send the report"
          name="frequency"
          options={["Daily", "Weekly", "Monthly"]}
          value={frequency}
          onValueChange={setFrequency}
          clearable
        />
        <RadioGroup
          label="Delivery"
          name="delivery"
          orientation="horizontal"
          defaultValue="standard"
        >
          <Radio value="standard" label="Standard" />
          <Radio value="express" label="Express" />
          <Radio value="courier" label="Courier" disabled />
        </RadioGroup>
      </div>
    </section>
  );
}

function Cards() {
  return (
    <section className={card}>
      <h2 className={cardTitle}>RadioGroup · cards</h2>
      <p className={cardNote}>
        The whole tile is the target, for choices that need explaining.
      </p>
      <RadioGroup
        label="Plan"
        name="plan"
        variant="card"
        defaultValue="team"
        options={[
          {
            value: "starter",
            label: "Starter",
            description: "Up to 3 projects",
          },
          {
            value: "team",
            label: "Team",
            description: "Unlimited projects and members",
          },
          {
            value: "enterprise",
            label: "Enterprise",
            description: "Talk to us",
            disabled: true,
          },
        ]}
      />
    </section>
  );
}

function Numbers() {
  const [qty, setQty] = useState<number | null>(1);

  return (
    <section className={card}>
      <h2 className={cardTitle}>NumberInput</h2>
      <p className={cardNote}>
        Hold a stepper button to repeat. The wheel is deliberately inert. Value:{" "}
        <code>{qty === null ? "null" : qty}</code>
      </p>
      <div className="flex flex-col gap-3">
        <NumberInput
          label="Quantity"
          min={1}
          max={99}
          value={qty}
          onValueChange={setQty}
        />
        <NumberInput
          label="Weight"
          description="Steps of 0.1 — press ↑ repeatedly and watch for 0.30000000000000004."
          step={0.1}
          decimals={1}
          defaultValue={0.1}
          trailing="kg"
        />
        <NumberInput
          label="Rounded to fives"
          description="snapToStep, counted from min."
          min={0}
          step={5}
          snapToStep
          defaultValue={10}
        />
        <NumberInput
          label="No stepper, clearable"
          stepper={false}
          clearable
          defaultValue={42}
        />
      </div>
    </section>
  );
}

function Money() {
  const [amount, setAmount] = useState<number | null>(1234.5);
  const [discount, setDiscount] = useState<number | null>(0.15);

  return (
    <section className={card}>
      <h2 className={cardTitle}>NumberInput · locales and units</h2>
      <p className={cardNote}>
        The same number in three notations. Type <code>1.234,56</code> into the
        German field.
      </p>
      <div className="flex flex-col gap-3">
        <NumberInput
          label="Amount (en-US)"
          locale="en-US"
          format="currency"
          currency="USD"
          decimals={2}
          value={amount}
          onValueChange={setAmount}
        />
        <NumberInput
          label="Betrag (de-DE)"
          locale="de-DE"
          format="currency"
          currency="EUR"
          decimals={2}
          value={amount}
          onValueChange={setAmount}
        />
        <NumberInput
          label="Montant (fr-FR)"
          locale="fr-FR"
          decimals={2}
          value={amount}
          onValueChange={setAmount}
        />
        <NumberInput
          label="Discount"
          description={`Shown as a percentage, held as ${discount ?? 0}.`}
          format="percent"
          step={0.01}
          min={0}
          max={1}
          value={discount}
          onValueChange={setDiscount}
        />
      </div>
    </section>
  );
}
