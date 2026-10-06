/*
 * The difficulty floor: keyword matching, deliberately not clever.
 *
 * Its job is to answer a question the model numbers cannot answer on their
 * own — how much of this corpus is just pattern matching? If a rule system
 * written in an afternoon gets 55%, then a model scoring 70% is buying far
 * less than it looks like it is buying.
 *
 * It is allowed to read the runtime contract, because that is the same
 * information the models get and withholding it would rig the comparison. It
 * is not allowed anywhere near the expected answers.
 *
 * Resisting the temptation to improve this is part of the design. Every rule
 * added here to chase a case is a rule that makes the floor less honest.
 */

const SCALE = String.raw`(?:\d[\d,.]*\s*(?:lakhs?|lacs?|crores?|cr|k|mn|million|billion|bn|thousand)?%?)`;
const AMOUNT = new RegExp(String.raw`(?:[₹$€£]\s*)?${SCALE}`, "i");

const GREATER = /\b(?:above|over|more than|greater than|at least|exceeds?|>=?)\b/i;
const LESS = /\b(?:below|under|less than|fewer than|at most|<=?)\b/i;

const pick = (text, list) => list.find((entry) => text.includes(entry.toLowerCase())) ?? null;

/** The first amount written in the text, as written — coercion reads it later. */
function amountIn(text) {
  const match = AMOUNT.exec(text);
  if (!match) return null;
  const written = match[0].trim();
  return /\d/.test(written) ? written : null;
}

function matchColumnValue(text, contract) {
  for (const column of contract.columns) {
    if (!column.filterable) continue;

    if (column.options) {
      for (const option of column.options) {
        if (text.includes(option.label.toLowerCase()) || text.includes(String(option.value).toLowerCase())) {
          return { action: "filter", column: column.id, operator: "in", value: [option.value] };
        }
      }
      continue;
    }

    const values = column.stats && column.stats.kind === "string" ? column.stats.values : null;
    const hit = values && pick(text, values);
    if (hit) return { action: "filter", column: column.id, operator: "equals", value: hit };
  }
  return null;
}

function matchNumericFilter(text, contract) {
  const amount = amountIn(text);
  if (!amount) return null;

  const column = contract.columns.find(
    (entry) =>
      entry.filterable &&
      entry.type === "number" &&
      [entry.id.toLowerCase(), entry.label.toLowerCase(), ...(entry.synonyms ?? [])].some((word) =>
        text.includes(String(word).toLowerCase()),
      ),
  );
  if (!column) return null;

  if (GREATER.test(text)) return { action: "filter", column: column.id, operator: "gt", value: amount };
  if (LESS.test(text)) return { action: "filter", column: column.id, operator: "lt", value: amount };
  return null;
}

function matchSort(text, contract) {
  if (!/\b(?:sort|order by|highest|lowest|biggest|smallest|newest|oldest|first|top|best|worst)\b/i.test(text)) {
    return null;
  }
  const column = contract.columns.find(
    (entry) =>
      entry.sortable &&
      [entry.id.toLowerCase(), entry.label.toLowerCase(), ...(entry.synonyms ?? [])].some((word) =>
        text.includes(String(word).toLowerCase()),
      ),
  );
  if (!column) return null;

  const descending = /\b(?:desc|descending|highest|biggest|largest|newest|most|top|best|z to a)\b/i.test(text);
  return { action: "sort", column: column.id, direction: descending ? "desc" : "asc" };
}

function interpret(utterance, contract) {
  const text = utterance.toLowerCase().trim();
  const has = (pattern) => pattern.test(text);

  if (has(/\bundo\b/)) return [{ action: "undo" }];
  if (has(/\bredo\b/)) return [{ action: "redo" }];
  if (has(/reset (?:the )?columns?|columns? back/)) return [{ action: "resetColumns" }];
  if (has(/clear (?:the )?selection|deselect (?:all|every)/)) return [{ action: "clearSelection" }];
  if (has(/select (?:all|every ?thing)/)) return [{ action: "selectAll" }];
  if (has(/clear (?:all |the )?filters?|remove (?:the )?filters?|show everything/)) {
    return [{ action: "clearFilters" }];
  }
  if (has(/(?:clear|remove) (?:the )?search/)) return [{ action: "search", text: "" }];

  if (has(/\bprint\b/)) return [{ action: "print" }];
  if (has(/\bcopy\b/)) return [{ action: "copy" }];
  if (has(/\bexport\b|\bdownload\b|\bspreadsheet\b|\bcsv\b|\bexcel\b|\bpdf\b/)) {
    const format = has(/\bexcel\b|\bspreadsheet\b/) ? "excel" : has(/\bpdf\b/) ? "pdf" : "csv";
    const scope = has(/\bselected\b/) ? "selected" : has(/\bpage\b/) ? "page" : has(/\bevery ?thing\b|\ball\b/) ? "all" : undefined;
    return [{ action: "export", format, ...(scope ? { scope } : {}) }];
  }

  const search = /(?:search for|search|find|look for)\s+(.+)$/i.exec(utterance.trim());
  if (search && !has(/\bcustomers? (?:from|in|with)\b/)) {
    return [{ action: "search", text: search[1].replace(/[.?]$/, "").trim() }];
  }

  const rows = /\b(\d+)\s*(?:rows?)?\s*per page\b/i.exec(text);
  if (rows) return [{ action: "setPageSize", size: Number(rows[1]) }];
  const page = /\bpage\s+(\d+)\b/i.exec(text);
  if (page) return [{ action: "setPage", index: Math.max(0, Number(page[1]) - 1) }];

  const numeric = matchNumericFilter(text, contract);
  if (numeric) return [numeric];

  const value = matchColumnValue(text, contract);
  if (value) return [value];

  const sort = matchSort(text, contract);
  if (sort) return [sort];

  return null;
}

module.exports = {
  id: "baseline",
  provider: "local",
  modelId: "keyword-rules-v1",
  supportsConstrained: false,
  unavailable: () => null,

  async complete({ user, contract }) {
    const started = process.hrtime.bigint();
    const intents = interpret(user, contract);
    const response = intents
      ? { result: "command", intents }
      : { result: "declined", reason: "No rule matched this request." };
    const latencyMs = Number(process.hrtime.bigint() - started) / 1e6;
    return { text: JSON.stringify(response), latencyMs };
  },
};
