# Builder feedback: @synthetism/did

## Metadata

- Model: gpt-6.1-terra
- Role: builder.
- Assistant environment: AI assistant using Copilot SDK in VS Code.
- Model and model version: not exposed to me in this session; I cannot reliably identify them.
- Session: `75977cb9-2439-4895-ab23-2b6daae090be`.
- Date: 2026-11-01, UTC+08:00.
- Protocol: Code Conformance Protocol 0.7; local runner reported version 0.7.2.
- Target: `synthetism/packages/did/src/did-key.ts`.
- Approximate elapsed time from the build request at 12:51:53 to the saved green judge at
  12:53:39: 1 minute 46 seconds. This is wall-clock time, not measured active coding time; the
  subsequent suite recheck and handover are not included.

## What happened

The target implementation was missing. The package already had a base58 codec, so I reused it
and implemented the DID layer. The user explicitly prohibited reading the conformance suite
and adapter, even though the builder instructions normally direct me to read them. I read the
brief, protocol, and builder instructions and used runner verdicts to diagnose failures. The
brief stated that the adapter imports the build, so I built before judging.

The first judge run was red: 31 of 60 vectors passed. After implementation and rebuilding,
60 of 60 passed and the saved judge reported no failures. The suite check was green both before
and after, with 37 of 37 mutants killed and one existing open question. The first red verdict,
including its complete failure list, was retained in the session artifacts. The package build,
type-check, and additional randomized round-trip checks also passed.

This is one run on a small, partly implemented package, not a controlled comparison with
prose-first development. The brief says the suite was reconstructed from an earlier
implementation; a green judge is evidence that this implementation satisfies the cases, not
proof that the suite covers every intended behavior. The deliberately incomplete initial
implementation explains the red run; red alone does not demonstrate suite quality.

## Difficulties and ambiguities

1. **The reading restriction changes the intended workflow.** The builder guide asks for
   vectors first and the adapter and ops before interpreting failures. The request instead
   forbade reading the suite, so I followed the brief and the judge output. The protocol does
   not describe this restricted variant or its trade-offs. In particular, the runner's failure
   messages expose expected values even when the suite files are not opened. A clearly named
   blind-builder mode, with an explicit policy for what diagnostics may reveal, would make the
   experiment easier to interpret.

2. **The brief alone did not specify all exact refusal messages.** It says error messages and
   class names are part of the wire contract, but does not spell out every exact message or
   precedence when multiple validation faults apply. I obtained the exact wording needed for
   the cases from the red judge output. This was workable, but it required a red/repair cycle
   rather than permitting a complete implementation from prose alone. The declared vectors
   normally supply the missing detail; in this restricted pass I could not inspect them.

3. **Questions permission is inconsistent in the protocol.** Section 6 gives the builder `rw`
   on questions, and section 14 permits builders to raise them, but section 5.1 says the builder
   MUST NOT write outside the implementation. The builder guide also says both to write only
   code and to put ambiguities in `questions.yaml`. Clarifying that questions are an explicit
   exception would eliminate the conflict. I did not raise a question during this pass.

4. **Historical handover text conflicts with the current guard decision.** The brief's current
   invariant and Decisions section say `isDidKey` catches every throw, including defects. Its
   historical handover still describes a surgical catch and unchecked obligation, and later
   mentions a survivor after saying that the human removed it. I followed the current invariant
   and decision, not the historical description. Marking superseded history more clearly would
   reduce the chance of implementing the old behavior.

5. **The first-red rule can be satisfied by an intentionally incomplete implementation.** That
   is exactly what happened here, as directed by the builder guide's smallest-slice workflow.
   The red is a useful record, but it does not by itself establish that the suite detects a
   realistic defect. The separate mutant result is stronger evidence for that purpose. The spec
   could state that distinction explicitly.

6. **Build freshness depends on knowing the adapter's import.** The guide correctly emphasizes
   rebuilding when the adapter imports `dist/`. With adapter reading prohibited, I relied on the
   brief's explicit build-import decision. A runner diagnostic that identifies the entrypoint and
   reports a possible stale build, without linking the implementation or changing the verdict,
   could prevent wasted iterations; any such feature needs to preserve the protocol's boundary.

## Suggested improvements

- Resolve the questions ACL conflict and document the allowed blind-builder workflow.
- Clearly distinguish active claims from superseded handover history.
- Document which exact errors and validation precedence require vectors, and offer a way to
  inspect or report those contracts without exposing unrelated cases when blindness is required.
- Make the difference between an initial red run and mutant-based suite evidence explicit.
- Keep the existing actionable per-vector failure output, version handshake, and saved verdict:
  they made the build loop straightforward. A documented, low-friction local-runner fallback
  avoided a registry dependency in this run.

No separate unchecked-obligations section was present in the current brief. The guard's
catch-all behavior was an explicit current decision, not an unchecked surgical-catch obligation.
