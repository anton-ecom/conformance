# Builder experience: Harbor

## Metadata

- **Model:** gpt-6.1-terra
- **Nickname:** Harbor
- **Role:** Builder
- **Assistant:** AI assistant using Copilot SDK in VS Code
- **Model and version:** Not exposed to me in this session; I cannot reliably identify them.
- **Date:** 2026-11-01
- **Target:** `@synthetism/did`, `src/did-key.ts`
- **Protocol:** Code Conformance Protocol 0.7
- **Runner:** 0.7.2, invoked from the local protocol repository
- **Elapsed time:** Approximately 2 minutes 27 seconds from the request timestamp
  (14:00:01, UTC+08:00) to the saved green judge verdict (14:02:28). This is
  wall-clock time, not measured coding time; it includes reading, implementation,
  builds, and verification.

## Experience and outcome

I read the builder guide, protocol, brief, vectors, adapter, mutant manifest, and
existing codec. There were no projection ops in this suite. The adapter imports
`dist/`, so the build step before judging was essential.

I implemented derivation first and ran the judge against a deliberately incomplete
implementation. The red verdict passed 41 of 60 vectors and reported 19 failures.
After implementing resolution and the guard, the judge passed all 60 vectors with
no failures. I then ran `judge --save` and verified the saved verdict. The suite
verdict was green before and after the build: 10 invariants covered and 37 of 37
mutants killed. Typecheck and existing tests also passed, as did a separate check
of 256 key round trips and DID URL variants.

The red run demonstrates that the judge reached an incomplete implementation; it
does not itself establish suite quality. The mutant result is separate evidence
about what the suite detects.

## What worked well

- Exact vectors and pinned error messages made the expected interface concrete and
  made failure diagnosis direct.
- The adapter made the library-to-wire mapping explicit, including the distinction
  between DID-layer and codec errors.
- The instruction to check whether the adapter loads built output prevented a
  stale-build verdict.
- The role ACL made it clear that I must not adjust the suite to make my code pass.
- The required red-to-green sequence produced a useful record of the unfinished
  implementation and the final result.

## Ambiguity and difficulties

1. **Builder access to questions.** The builder guide describes the builder's
   access to questions as read-only in its ACL summary, but later instructs the
   builder to raise questions. SPEC 0.7 section 6 explicitly gives the builder
   read/write access to questions, and section 5.1 permits writing a question as
   the exception to the implementation-only rule. I followed the SPEC. Aligning
   the guide's summary would avoid a needless decision.
2. **Wrapping codec errors without hiding defects.** The existing codec throws
   plain `Error` objects with a message prefix. The DID layer must wrap codec
   refusals, while unexpected defects should remain visible. I identified the
   declared codec refusal using that message prefix; this couples the wrapper to
   text and cannot distinguish an unrelated defect with the same prefix. A
   dedicated codec error type, while retaining the specified wire name and
   message, would provide a clearer boundary. This is feedback on the interface,
   not a claim that the suite requires such a type.
3. **Composition is outside the vector format.** The existing open question
   records that a vector cannot express the two-operation round trip. I checked
   round trips separately, but this was additional evidence rather than a
   conformance vector. The distinction was clear once I read the question.
4. **No build-time measurement in the verdict.** The saved verdict records the
   result, not task start time or time spent reading, building, and judging.
   The duration above is an approximation from available timestamps, not a
   runner measurement.

I did not raise any new suite questions. The existing composition question
remained open, as allowed by the protocol.

## Suggestions to reduce build time

- Provide a short, generated entry-point summary listing operations, adapter
  import path, required build command, runner version, and whether projections
  are used. Keep the underlying vectors and adapter authoritative.
- Offer an explicit preflight that checks the runner/spec version handshake,
  adapter path, and whether the imported build exists before a judge run. If it
  detects that source is newer than the build, warn rather than silently judge
  stale output.
- Make it easy to retain the first red verdict outside the suite, alongside the
  final saved verdict, without implying that red alone validates suite quality.
- Consider optional timing metadata for runner phases and a separate task timer;
  keep timing out of the pass/fail comparison.
- Explore a protocol-level composition mechanism for round trips, while keeping
  the current explicit limitation and not treating a composite adapter operation
  as proof of the library's composition.
