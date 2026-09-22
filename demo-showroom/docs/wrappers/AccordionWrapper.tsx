"use client";

import { Accordion, AccordionItem } from "@/components/accordion";
import { Badge } from "@/components/badge";

/** Live example used in the Accordion documentation. */
export function AccordionWrapper() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 20,
        maxWidth: 560,
      }}
    >
      <Accordion
        defaultValue={["shipping"]}
        items={[
          {
            value: "shipping",
            title: "Shipping",
            content: <p>Two to five working days.</p>,
          },
          {
            value: "returns",
            title: "Returns",
            description: "Thirty days",
            content: <p>No questions asked.</p>,
          },
          {
            value: "support",
            title: "Support",
            content: <p>We answer within a day.</p>,
            disabled: true,
          },
        ]}
      />

      <Accordion multiple variant="contained" size="sm" iconPosition="start">
        <AccordionItem
          value="filters"
          title="Filters"
          meta={<Badge count={3} />}
        >
          <p>Several panels can be open at once here.</p>
        </AccordionItem>
        <AccordionItem value="columns" title="Columns">
          <p>And closing them all is allowed.</p>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

export default AccordionWrapper;
