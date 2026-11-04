# Builder feedback — keywright

Written from the build, not from anyone else's notes. I did not read other feedback files, and during the build I did not read any other document in this folder besides `BUILDER.md` and the ACL portion of `SPEC.md`.

## Metadata

| | |
|---|---|
| Model | Grok4.7 |
| Nickname | keywright |
| Role this pass | builder |
| Host | AI assistant, Copilot SDK in VS Code (`AI_AGENT=github_copilot_vscode_agent`) |
| Model id | not disclosed to the agent process. I will not invent one. Subagent default in the environment was `gpt-5.6-luna`; that is not evidence of which model wrote the library. |
| Session | `ahp-session:/b62cdd38-aad3-43f3-8c13-94429ca65381` |
| Copilot session | `fb5b4d31-07c8-4904-81ef-07f3d3793214` |
| Host chat title | Builder 4a: clean |
| Started | 2026-11-01T07:01:00Z |
| Build prompt seen | 2026-11-01T07:03:13Z |
| Package | `@synthetism/did` — `did:key`, both directions |
| Protocol | Code Conformance Protocol 0.7 |
| Runner | local `conformance/runner/runner.mjs`, reported `0.7.2`, spec `0.7` |
| Implementation | `synthetism/packages/did/src/did-key.ts` (135 lines added). `base58.ts` was already there and was not edited. |
| Suite touched | no |

## Built time

Wall clock, not model time.

| mark | when (UTC) | note |
|---|---|---|
| prompt | 07:03:13 | start reading the suite |
| red judge saved | 07:05:38 | stub only. 26/60 passed, 34 failed. `judge-2026-11-01T07-05-38-091Z.json` |
| green judge saved | 07:06:35 | first real implementation. 60/60, `ok: true`. `judge-2026-11-01T07-06-35-593Z.json` |
| suite saved | 07:07:43 | `ok: true`, 37/37 mutants killed, 0 survived, 1 open question. `suite-2026-11-01T07-07-43-860Z.json` |

From the prompt to a green judge: **3 minutes 22 seconds**.
From the prompt to a green suite run as well: **4 minutes 30 seconds**.

The real implementation was written once, built once, and judged green. There was no fix cycle after that. The only red judge was the deliberate stub the method asks for. That stub proved the judge was reached. It did not prove the suite can see a defect. The mutant count did, and I did not write the mutants.

Almost all of the 3 minutes was reading. `tsc` plus `judge` on 60 vectors was a few seconds. `suite` on 37 mutants was about a minute.

## What the protocol did well

The vectors were a specification of the interface, not a pile of examples. Operation names, `given`, and `expect` were enough to write the module without inventing a signature. The wire table in the brief matched the adapter, and the adapter matched the vectors. I never had to guess what `didKeyFromPublicKey` returns.

Exact comparison is the right instrument for this library. A failure arrived as `expected X got Y` with the vector id. That is faster than a stack trace. I did not open the source to interpret a red run. The `why` already named the decision.

Pinning both `throws.name` and `throws.message` removed the usual argument about whether a reworded error is "the same behaviour". It is not, under this protocol, and that was clear before I wrote `DidKeyError`. Setting `this.name = "DidKeyError"` was a one-line consequence of ERR-001, not a style choice.

The red-then-green rule did not slow the build. A stub is ten lines. The red verdict is the only evidence I can point at that the later green run was not a judge that never started. Keep it. Do not drop it to save a minute.

`--save` writing outside the suite meant I could keep that red verdict without violating the one rule that matters: the builder does not edit the suite to go green.

`questions` not blocking was correct. One question was already open, about a round trip across two operations. No vector asked me to settle it. I shipped. That is the right outcome.

`mutants.yaml` was worth the read, as a list of plausible wrong implementations, not as something to special-case. "Do not trim, do not case-fold, do not slice a long payload, do not unwrap a 33-byte key, wrap every codec fault" is a checklist a careful person would otherwise invent halfway through. I did not mention a mutant name in the code.

The suite run after the build still killed every mutant. I did not need to touch the suite to get there. That is the property the protocol is selling, and on this pass it held.

## Ambiguity

I did not read the whole spec. `SPEC.md` is long, the reader truncated it, and the method file already restated the rules I needed: do not change `expect`, vectors win in the room, the only extra write is a question. I read the role rules and the ACL table. I did not find a disagreement between those pages and `BUILDER.md`, because I did not read enough of the spec to be entitled to say it is unambiguous. If a later chapter contradicts the builder file, this pass would not have noticed.

What I did have to resolve, and how:

**No `ops/` directory.** The method says read `ops/` second, because `expect` is the op's output. This suite has no ops. I inferred that the runner compares the adapter's JSON object exactly. That inference was right, and it cost a minute of looking. Say it in the method: if the suite has no ops, comparison is exact equality of one JSON object, and there is nothing to project. A builder who goes looking for a missing directory assumes they have the wrong tree.

**Two-stage prefix check.** The brief says the match on `did:key:z` is exact. The vectors use two different messages: `not a did:key` and `unsupported multibase prefix … (expected "z")`. Those cannot be one check. The split is recoverable from the vectors, which is what the protocol says should happen, and it did. It is still a brief ambiguity. A decision row — "method prefix first, then the single multibase character, and the message names which stage failed" — would have saved reading every RESOLVE vector before knowing the shape of the function. I would not call it a blocker. I would call it the difference between skimming and transcribing.

**Codec wrap is a translation, and only the vectors state it.** The codec throws `base58btc: invalid character "0" at position 0`. The DID layer must throw `invalid base58btc payload in "<did>" (invalid character "0" at position 0)`. Stripping the `base58btc: ` prefix is not written in the brief. I inferred it by putting B58D-002 next to ERR-001. It worked on the first judge. If the codec message had been worded differently, a builder who wrapped `error.message` whole would have been red for a reason the prose never names. One sentence in the brief, or in the wire table, would close it: the parenthetical is the codec message with the `base58btc: ` prefix removed, and the quoted DID is the original input, not the stripped base.

**The ellipsis is a character, not three dots.** The brief says an overlong input appears as its first 32 characters followed by `…`. I used the character that was in the vector. Had I written `...`, the suite would have gone red with the behaviour unchanged. That is the protocol working, and it is also a small trap. Name the codepoint, or show the message in a fenced line so a proportional font cannot hide which glyph it is.

**Fault precedence is unclaimed, and the method says not to guess.** The decisions table says an input with two faults may get a different message from each conformant implementation, and that pinning an order would settle a question the claim never asks. The method says if you would have to guess, write `questions.yaml` and stop on that operation if the vectors pin neither reading. Every vector I was given had one fault. The intersection — odd length and a non-hex character, or an odd-length string longer than 32 characters — is unpinned. I did not raise a question. I implemented a total order (odd length, then charset, then byte length) and applied the 32-character preview to both message kinds. Nothing in the suite contradicted it. A later vector could redden that choice without either implementation having been wrong.

That pair of rules will cost build time on a less tidy suite. A builder who treats the method strictly stops and writes a question. A builder who treats the decisions table strictly picks an order and moves on. Both are defensible. Tell the builder which one you want when the unpinned region is not an input any vector uses: implement a total function, do not block, and do not open a question unless a vector forces the guess. I lost no time here only because I chose the second reading without asking.

**`DidKey` is exported and untested.** `index.ts` already exported the type. No vector mentions it. I branded a string so the export was not a lie. The judge cannot see that. It is not ambiguity in the claim. It is surface area the suite does not own. Fine for this pass. Do not let an index file become a second brief.

**`isDidKey` swallowing defects.** The decisions table says the guard swallows every throw, not only `DidKeyError`. The vectors can only show refusals, which a surgical catch would also swallow. I implemented the decision with a bare `catch`. There was no `Unchecked obligations` section. The decision was enough. I did not find that ambiguous.

## Difficulties

None of these were in the claim. They were in the path to the claim.

The shell starts at the workspace root, not the package. The first `npm run build` failed because `/Users/helios/Dev/ecom` has no `package.json`. The method does say to run from inside the package. I missed it once. A `judge` invocation from the wrong directory fails as a missing suite or a missing script, which looks like a broken tree. A single package script — build, then `judge conformance/implementation.mjs --save` — would remove both that miss and the stale-`dist/` miss. The stale-build warning was repeated often enough that I did not judge `src/` by accident. The repetition worked. A script would still be cheaper than relying on the reader to remember it.

Reading was the whole build. Ten vector files, the adapter, the mutant list, the brief, and enough of the method to know what I must not write. The suite itself is the right size. The method document is longer than the module it produced. For a builder, the useful subset is one page: read vectors, then the adapter, then the brief; write only the implementation and questions; build before judge if the adapter imports `dist/`; keep the red run; do not touch the suite. I already had that page, and I still read more of it than I used.

I did not use `npx -y conformance-runner@0.7`. The runner was in the workspace and the suite declared `0.7`, so I ran the local file. It reported `0.7.2` and agreed with the suite. No version refusal. The fallback path in the method is clear. I have nothing to complain about there.

The open question did not slow me. The absence of ops did, slightly. The prefix-stage split did, slightly, and only as reading time. Nothing in the vectors was impossible, contradictory, or worded so that I had to stop.

## What would reduce the next build

1. State, in the method, that a suite with no `ops/` is exact JSON equality. Do not send the builder looking for a directory that is allowed to be absent.
2. Put the refusal grammar in the brief next to the wire table: which stage produces which message, and how a codec message is embedded. The vectors can keep pinning the strings. The prose should name the transformation so the first implementation is a reading, not a diff between two files.
3. When precedence is deliberately unclaimed, say the builder must not open a question for the unpinned intersection. Otherwise the "do not guess" rule and the "do not pin an order" decision pull in opposite directions.
4. Ship `npm run conform` in the package: `tsc`, then `judge --save`, with the working directory fixed. That is the only operational miss I made, and it is the one the instrument cannot explain.
5. Do not ask a builder to read a 900-line spec before a module this size. The ACL page is the spec, for this role. If another chapter is normative over the method, say which one. I will not pretend to have reviewed chapters I did not read.

## Verdict on the product, from this one pass

The suite was a sufficient source of truth. I wrote the library the vectors described, I did not edit the suite, and the first complete implementation was green. The brief told me why the encoding exists. The vectors told me what to return. Where they might have disagreed, the vectors were specific enough that I never had to choose. That is the experience you are trying to produce, and on `did:key` it happened.

The time left on the table is not judge time. It is the minute spent confirming that a missing `ops/` directory was not a missing suite, and the reading required to reconstruct a two-stage refusal the vectors had already fixed. Close those in the prose. The runner does not need to change.
