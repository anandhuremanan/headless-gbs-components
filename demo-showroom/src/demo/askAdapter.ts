import type { AgentAdapter } from "@/components/shared";

/*
 * The application's own adapter — this lives in the demo, not in the library.
 *
 * It sends what the person typed plus this grid's live contract to the app's
 * own `/api/ask`, which holds the key and builds the prompt. The library ships
 * no provider, no key handling and no network code; swapping Gemini for
 * anything else is a change to this file and that endpoint.
 */
export const askViaAppBackend: AgentAdapter = async ({
  utterance,
  contract,
  responseSchema,
  signal,
}) => {
  const response = await fetch("/api/ask", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ utterance, contract, responseSchema }),
    signal,
  });

  const payload = (await response.json()) as { content?: string; error?: string };
  if (!response.ok) throw new Error(payload.error ?? `ask failed: ${response.status}`);

  /*
   * Parsed, not repaired. If constrained decoding did its job this always
   * succeeds; if it did not, that is a finding rather than something to patch
   * over with brace-extraction.
   */
  try {
    return JSON.parse(payload.content ?? "");
  } catch {
    throw new Error(`The model did not return JSON: ${(payload.content ?? "").slice(0, 160)}`);
  }
};

/** Whether this app has a key configured, so the UI can offer the box or not. */
export async function askBackendAvailable(): Promise<boolean> {
  try {
    const response = await fetch("/api/ask");
    if (!response.ok) return false;
    return ((await response.json()) as { available?: boolean }).available === true;
  } catch {
    return false;
  }
}
