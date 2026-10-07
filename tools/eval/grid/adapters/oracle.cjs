/*
 * A "model" that already knows the answer.
 *
 * It exists so that a disappointing benchmark can be attributed. If the
 * oracle does not score 100%, the harness is wrong — the prompt, the scorer,
 * the canonicalisation, the execution comparison, something — and no model
 * number collected before that is fixed means anything.
 *
 * It is the only adapter that receives the expected answer, it says so
 * through `needsOracle`, and the runner refuses to report it as a benchmark
 * result.
 */

module.exports = {
  id: "oracle",
  provider: "harness",
  modelId: "expected-answers",
  supportsConstrained: false,
  needsOracle: true,
  benchmark: false,
  unavailable: () => null,

  async complete({ oracle }) {
    const started = process.hrtime.bigint();
    /*
     * The order matters. A case that *requires* a question is answered with
     * one even though its stated outcome is a refusal — refusing there is now
     * a `missed_clarification`, and an oracle that refused would fail its own
     * self-test for the right reason, which is still a failure.
     */
    const response =
      oracle.clarify === "required"
        ? { result: "clarify", question: "Which value did you mean? I need that to proceed." }
        : oracle.expect === "reject"
          ? { result: "declined", reason: "This grid cannot do that." }
          : oracle.expect === "ambiguous"
            ? { result: "clarify", question: "Which reading of that did you mean?" }
            : { result: "command", intents: oracle.intents };
    return {
      text: JSON.stringify(response),
      latencyMs: Number(process.hrtime.bigint() - started) / 1e6,
    };
  },
};
