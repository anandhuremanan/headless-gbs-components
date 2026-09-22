"use client";

import { useState } from "react";
import { NumberInput } from "@/components/number-input";

/** Live example used in the NumberInput documentation. */
export function NumberInputWrapper() {
  const [quantity, setQuantity] = useState<number | null>(1);
  const [amount, setAmount] = useState<number | null>(1234.5);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
        maxWidth: 420,
      }}
    >
      <NumberInput
        label="Quantity"
        description="Hold a stepper button to repeat. The wheel deliberately does nothing."
        min={1}
        max={99}
        value={quantity}
        onValueChange={setQuantity}
      />

      <NumberInput
        label="Amount"
        locale="en-US"
        format="currency"
        currency="USD"
        decimals={2}
        value={amount}
        onValueChange={setAmount}
      />

      <NumberInput
        label="Betrag"
        description="The same number, read and written in German notation: try 1.234,56"
        locale="de-DE"
        format="currency"
        currency="EUR"
        decimals={2}
        value={amount}
        onValueChange={setAmount}
      />

      <NumberInput
        label="Weight"
        step={0.1}
        decimals={1}
        defaultValue={0.1}
        trailing="kg"
      />

      <code style={{ fontSize: 12, opacity: 0.7 }}>
        quantity: {quantity === null ? "null" : quantity} · amount:{" "}
        {amount === null ? "null" : amount}
      </code>
    </div>
  );
}

export default NumberInputWrapper;
