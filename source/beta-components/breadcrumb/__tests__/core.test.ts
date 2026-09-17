import { describe, expect, it } from "vitest";
import { collapseItems, toBreadcrumbJsonLd } from "../core/trail";

const shape = (slots: ReturnType<typeof collapseItems>) =>
  slots.map((slot) => (slot.kind === "item" ? slot.index : `…${slot.hidden.join(",")}`));

describe("collapsing", () => {
  it("leaves a short trail alone", () => {
    expect(shape(collapseItems(3))).toEqual([0, 1, 2]);
    expect(shape(collapseItems(4, 4))).toEqual([0, 1, 2, 3]);
  });

  it("keeps the first and last crumbs around an ellipsis", () => {
    expect(shape(collapseItems(6, 4))).toEqual([0, "…1,2,3,4", 5]);
  });

  it("keeps more on either side when asked", () => {
    expect(shape(collapseItems(7, 4, 1, 2))).toEqual([0, "…1,2,3,4", 5, 6]);
    expect(shape(collapseItems(7, 4, 2, 2))).toEqual([0, 1, "…2,3,4", 5, 6]);
    expect(shape(collapseItems(7, 4, 0, 1))).toEqual(["…0,1,2,3,4,5", 6]);
  });

  it("doesn't collapse when the kept crumbs already cover the trail", () => {
    expect(shape(collapseItems(4, 2, 2, 2))).toEqual([0, 1, 2, 3]);
  });

  it("always keeps the current page", () => {
    expect(shape(collapseItems(5, 2, 1, 0))).toEqual([0, "…1,2,3", 4]);
  });
});

describe("structured data", () => {
  it("builds a schema.org BreadcrumbList with absolute links", () => {
    const data = toBreadcrumbJsonLd(
      [
        { name: "Home", href: "/" },
        { name: "Invoices", href: "/invoices" },
        { name: "INV-042" },
      ],
      "https://app.example.com/billing/",
    );
    expect(data).toEqual({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://app.example.com/" },
        { "@type": "ListItem", position: 2, name: "Invoices", item: "https://app.example.com/invoices" },
        { "@type": "ListItem", position: 3, name: "INV-042" },
      ],
    });
  });

  it("keeps links as given without a base URL", () => {
    expect(toBreadcrumbJsonLd([{ name: "Docs", href: "https://example.com/docs" }]).itemListElement[0].item).toBe(
      "https://example.com/docs",
    );
  });
});
