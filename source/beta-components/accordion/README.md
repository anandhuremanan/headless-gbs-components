# Accordion

Sections that open and close, built on native `<details>` and `<summary>`, for
React 19 and styled to match the rest of the library. No runtime dependencies
besides React.

```ts
import { Accordion, AccordionItem } from "@/components/accordion";
import "@/components/accordion/styles.css";
```

```tsx
<Accordion
  defaultValue={["shipping"]}
  items={[
    { value: "shipping", title: "Shipping", content: <p>Two to five days.</p> },
    { value: "returns", title: "Returns", content: <p>Thirty days, no questions.</p> },
  ]}
/>

<Accordion multiple variant="contained">
  <AccordionItem value="one" title="Details" meta={<Badge count={3} />}>
    …
  </AccordionItem>
</Accordion>
```

**Accordion:** `value` / `defaultValue` / `onValueChange` (string arrays),
`items` or `<AccordionItem>` children, `multiple`, `collapsible`, `variant`
(`separated` `contained` `plain`), `size`, `iconPosition`, `classNames`, `ref`.

**AccordionItem:** `value`, `title`, `description`, `children`, `meta`, `icon`,
`disabled`, `classNames` (`root` `header` `title` `description` `icon`
`content` `body`), `ref` (the `<details>`).

The browser owns the disclosure: the header is focusable, Enter and Space work,
the panel is out of the accessibility tree while closed, and Ctrl+F finds text
inside a closed panel where the browser supports it. What the component owns is
the group — which panel is open, and whether the last one may be closed —
because `<details name>` alone cannot express that and gives no value to store.

Opening animates in browsers that have `interpolate-size` and
`::details-content`, and simply shows and hides everywhere else.

`toggleOpen` and `normalizeOpen` are exported from the framework-free `core`.
