# The Code Conformance Protocol

Author: **[0en](anton@synthetism.ai)**

**Version 0.1 · 25.10.26 · syntax and constraints only**
**Version 0.2 · 28.10.26 · The loop, roles, rules**
**Version 0.3 · 29.10.26 · one chapter per artefact; every rule lives with the thing it governs**
**Version 0.4 · 29.10.26 · the wire, obligations, and the direction rule**
**Version 0.5 · 30.10.26 · the surface, machine-readable questions and attack, the specimen**

---

## 1. Abstract

This document specifies the format of a **suite**, the process contract its executables
satisfy, and the two verdicts a runner MUST produce from it. It does not specify what any
particular suite should claim.

A runner is language-agnostic because it never links an implementation. Everything it
executes is a process: one JSON object in, one JSON object out. The runner's ignorance of
the domain is the property that makes it portable, and it MUST be preserved.

---

## 2. Normative language

`MUST`, `MUST NOT`, `SHOULD`, `MAY` are used as in RFC 2119.

This document defines **form and verdicts**. It does not define the values of any suite.

---

## 3. Terms

| term | definition |
|---|---|
| **suite** | A `conformance/` directory containing a brief, vectors, mutants, ops, fixtures |
| **pass** | One session, in one context, held by one role (or compatible ones), from a starting point to one handover. What makes it a pass is the fixed context, not its length. Not the same word as a vector that *passes* — a pass produces a verdict, a vector gets one. |
| **brief** | Prose. Declares invariants. Its `###` headings are invariant ids. Never parsed beyond its headings. |
| **invariant** | A falsifiable claim about an operation, observable through the surface. Heading form: `### ID — statement`. |
| **obligation** | A claim the surface cannot carry. Prose in the brief, never a heading, because it can never have a vector. |
| **surface** | The governed interface of an implementation: which operations exist, and what shape a value takes as it crosses in or out (§16.2). Declared by the brief, implemented by the adapter — and the whole of what a suite can see. |
| **specimen** | A suite reconstructed from code and not yet attacked: pinned, labelled, and handed over with a green run that means nothing (§4, gate 0). |
| **control surface** | A suite after it has been claimed. From there the code is steered by changing the suite, and the builder may not touch `expect` (Convention 1). |
| **vector** | One case. `given` → `expect`, optionally through `fn`. |
| **op** | A projection. A process that transforms an implementation's output into comparable data. |
| **mutant** | A deliberately wrong implementation. Written to be rejected, in one declared way. |
| **fixture** | A frozen value only a machine can produce. Read, never computed. |
| **question** | A recorded ambiguity, in `questions.yaml`: an id, the invariant it is about, two readings, and a status (§14). Raised downstream; resolved by changing the brief. |
| **runner** | A process producing verdicts about a suite or about an implementation. |
| **implementation** | A process under test. |
| **adapter** | A process that implements the surface for one implementation: JSON in, JSON out, the library called behind it. Part of the suite, not the code. |
| **violation** | A defect the suite has, reported by `runner suite`. The set is closed. |
| **failure** | A vector the implementation does not satisfy, reported by `runner judge`. |
| **finding** | Code-review feedback. A claim about the suite, not about the code. |

---

## 4. The loop

Gates are ordered. A gate MUST NOT be passed with an open violation.

| # | gate | entry | exit |
|---|---|---|---|
| 0 | reconstruction | prompt, code, docs, intent | reconstructor delivered the draft suite |  **the code exists and is not yet accountable to anything.**
| 1 | brief | prompt, sources | human accepted the brief | **writer claims the brief**
| 2 | invariants + vectors + adapter | brief | writer delivered | **writer doesn't see the code**
| 3 | mutants | brief, vectors | adversary delivered | **adversary blind, attacks the suite, writer defends**
| 4 | suite | 1–3 | `runner suite` → `ok: true` | 
| 5 | build | brief, suite | builder delivered | 
| 6 | judge | suite, implementation | `runner judge` → `ok: true`, after being red |
| 7 | attack again | verdict, suite | new mutants; return to 4 | **adversary sees the code, writer defends, still doesn't see the code**
| 8 | pre-release | 4–7 | suite |
| 10 | code-review | 4–7 | suite |
| 11 | release | 4–7 | immutable suite |

Gate 3.1 (optional) adversary sees the code, attacks the suite, writer defends.

Gate 4 with writer not seeing the code is the point of the protocol. 

### 4.1 Rules

- A gate MUST NOT be passed while `runner suite` reports `ok: false` (§17).
- Gate 6 MUST be preceded by a red `runner judge`. A judge that was never red was never run.
- Gate 7 SHOULD produce at least one new mutant. A pass that produces none is an argument that the
  suite is complete, and that argument belongs to the human at gate 8.

---

## 5. Roles

Roles are context states, not people (Convention 3). One assistant may hold several; what it may not
do is carry one role's reading into another's. What each may touch is the ACL (§6). This chapter is
what each is *for* — and the human is at the top of it, because the human is the only party that can
be held to a decision (Convention 2).

- **human** — owns the brief and the suite, and accepts the diff at every gate. Accountable, because a
  model can be held to a specification and cannot be held to a choice.
- **writer** — turns the brief into vectors, and owns the surface between the suite and the code
  (§16.2). It holds the brief, which is exactly why it is the one party that cannot notice what the
  brief fails to say (§14).
- **adversary** — aims mutants at invariants. It is not looking for bugs; it is proving the suite would
  have found them (Convention 4).
- **builder** — writes the implementation against the suite. It MUST NOT change `expect`; when the code
  and the suite disagree, the code is wrong until the human says otherwise.
- **runner** — reads headings and executables, and no prose at all. Its ignorance of the domain is what
  makes it portable (§1).
- **reviewer** — reads the suite and the verdicts. If it cannot judge without the implementation, that
  is a finding about the suite (Convention 8).

### 5.1 Rules

- A role MUST NOT read or write what §6 forbids it. The separation is carried by context, not by the
  runner: once a file is written it has no author.
- The writer MUST NOT read the builder's reasoning. It MAY read the implementation; what it MUST NOT
  do is derive `expect` from it (§11.4).
- The builder MUST NOT write outside the implementation.
- **Order.** A pass settles its claims first, and MAY read the implementation afterwards. Anything it
  writes after reading the code is an **observation**, not a claim: it carries `from: code`, and the
  brief declares itself reconstructed. A pass that has read the implementation MAY still tidy the
  artefacts and write its report, but it MUST NOT originate another `from: brief` claim — because
  nobody downstream could tell a claim written from intent from one written to fit what it just read.

---

## 6. ACL

| role | brief | questions | vectors | mutants | ops | fixtures | adapter | implementation | verdicts |
|---|---|---|---|---|---|---|---|---|---|
| **human** | rw | rw | rw | rw | rw | rw | rw | rw | r |
| **writer** | rw | rw | rw | rw | rw | rw | rw | r* | r |
| **adversary** | r | rw | r | rw | r | r | r | r | r |
| **builder** | r | rw | r | r | r | r | r | rw | r |
| **reviewer** | r | rw | r | r | r | r | r | r | rw |
| **runner** | h | 0 | r | r | r | r | r | r | w |

`r` read · `w` write · `0` never · `h` headings only, never prose  · `r*` - `rw` with an exception.

`programmer` is the human in a coding session. It is the only row that is `rw` everywhere, which is
the point of the row: whoever can change anything can also explain why they changed it.

`r*` - Writer can edit the code once with human permission, new `pass` (context) is required to continue. 

### 6.1 Rules

- A role MUST NOT write outside its column. This table is the whole of the permission model.
- The runner's `0` on `questions` is not an omission. It validates the shape of a record — id,
  invariant, status, readings — and never what the readings say. A question is judged by a person.
- The ACL MUST NOT be mistaken for something enforced. Nothing checks it. It is a contract between
  passes, and it is broken by context rather than by a violation code.
- The `adapter` is the writer's. It is the surface made executable, it lives inside the suite, and it
  is the one artefact that translates rather than implements. When a claim needs to be observable and
  the surface does not carry it, the writer changes the adapter — not the library (§16.2).

---

## 7. Conventions

What we have convened to. These are the laws of the practice rather than the mechanics of the
format, so they carry no `MUST` — a law that needs a keyword is a rule, and the rules live with the
artefacts they govern.

**1. The suite is the source of truth.** When the suite changes, the code changes. Only in that
direction.

**2. The human is accountable.** The human is the author and owner of the suite, the judge of every
artefact, and signs off the implementation. A model can be held to a specification; it cannot be held
to a decision.

**3. A role is a context state.** One assistant may hold several roles; what it may not do is carry
one role's reading into another's.

**4. A suite with no attack has proved nothing.** Mutants are not an optional extra. The adversary
pass is what turns a suite of assertions into a suite that bites.

**5. Writing a mutant is not a role.** Whoever sees an attack writes it down immediately, in whatever
pass they happen to be in. Routing it through a designated owner is how attacks get lost.

**6. Ambiguity is resolved by changing the brief.** Never by answering in conversation — an answer
that lives only in a transcript gets answered differently next time.

**7. A reconstructed suite declares itself.** Intent inferred from code is a description of behaviour,
not a statement of it.

**8. Review the suite, not the code.** If a reviewer cannot judge without the implementation, the
suite is incomplete — and that is a finding about the suite, not about the reviewer.

---

## 8. The suite

### 8.1 Format

```
conformance/
  BRIEF.md
  questions.yaml                 open ambiguity as records: id, invariant, readings, status (§14)
  attack.yaml                    each adversary pass: what it aimed at, what survived (§13.3)
  vectors/
    <INVARIANT-ID>.yaml          one file per invariant
  mutants.yaml                   manifest
  mutants/
    <name>.mjs | <name>.php      mutant executables
  ops/
    <name>.mjs | <name>.php      op executables
    <name>.yaml                  the op's own vectors (§12)
  fixtures/
    manifest.yaml                name → file, plus a digest
    <name>.json                  frozen values, produced by a reviewed script
  implementation.mjs            the adapter: JSON in, a library call out (§16.2)
```

One file per invariant, one file per op, one manifest for each of mutants and fixtures. A suite is
read in that shape before it is read at all.

### 8.2 Rules

- `<INVARIANT-ID>` MUST equal a `### ID` heading in `BRIEF.md`.
- A suite MUST contain at least one invariant, one vector and one mutant.
- No artefact in a suite MAY be skipped. The format cannot express a skip (§11.4).
- Every path a suite records MUST be relative to the suite root. The suite is a directory that is
  moved, copied and run from wherever it happens to be.

---

## 9. Brief

Prose. Declares the invariants; its `###` headings are their ids. It is the only artefact the runner
never reads — the runner sees headings and nothing else.

### 9.1 Format

```
# <name>

<intent: what this is for, and what breaks if it is wrong>

### AREA-001 — <a statement that can be false>
...

## Decisions
| choice | not taken | cost |

## Unchecked obligations
| id | obligation | why the surface cannot carry it | who checks it |

## Out of scope
```

Nothing in that skeleton is parsed. The brief is written for two readers: the human deciding whether
the suite is worth running, and the writer turning it into vectors.

A brief inferred from an implementation carries a first line saying so, and every vector derived from
it carries `from: code` (Convention 7).

### 9.2 Rules

- The brief MUST be changed at gate 1, not merely approved. An accepted brief that was not edited was
  not read and remains `specimen`
- The brief MUST contain an intent: what the thing is for, and what breaks if it is wrong.
- Each `###` heading MUST be an invariant in the form §10.1 defines. Prose between headings is prose;
  nothing parses it and nothing enforces it.
- A brief reconstructed from an implementation MUST declare itself on its first line.
- A claim the surface cannot carry is an **obligation**. It MUST be listed under `## Unchecked
  obligations` and MUST NOT be a `###` heading: an invariant with no vector is `MISSING-VECTOR`, and
  that verdict is correct rather than a bug. The obligation's row names why the surface cannot carry
  it and what checks it instead — a mutant, a review, a person.
- The brief SHOULD contain an out-of-scope section. It is the risk register: the classes of failure
  knowingly not covered.
- The brief SHOULD contain a decisions section: one row per opinionated choice, the alternative not
  taken, and what the choice costs. A decisions section that records no cost is advocacy.

---

## 10. Invariant

A falsifiable claim about an operation, and the unit of attribution. A vector is an instance; an
invariant is universal. You cannot derive *no total is ever negative* from three cases, which is why
the claim is written down separately from the cases that check it.

### 10.1 Format

```
### ID — statement
```

| part | rule |
|---|---|
| `###` | the heading level. The runner recognises nothing else |
| `ID` | an area, a dash, a three-digit ordinal: `PRICE-002`, `VERIFY-001` |
| `—` | an em dash separates the name from the claim |
| `statement` | falsifiable: a sentence some implementation could make false |

One invariant, one vector file, one operation: `vectors/<ID>.yaml` names its operation on the second
line (§11.1), so a claim that spans two operations has to be split into two.

### 10.2 Rules

- An invariant id MUST match `^[A-Z][A-Z0-9]*(-[0-9]{3})$`. An id that does not is not recognised as
  an invariant at all, which turns its vectors into `ORPHAN-VECTOR`.
- An invariant heading MUST contain a statement that can be false. "validation works" cannot be
  falsified, and an invariant that cannot be falsified cannot be attributed to anything.
- Every invariant MUST have at least one vector (`MISSING-VECTOR`).
- An invariant MUST be observable through the surface (§16.2). A claim that is not cannot be a heading;
  it is an obligation (§9.2).
- Every invariant MUST have at least one mutant aiming at it, or it MUST be reported `UNFALSIFIABLE`.
- An invariant MUST NOT be reworded without changing its id: every verdict ever recorded against the
  id becomes unreadable the moment the claim under it changes.

---

## 11. Vector

One case: `given` in, `expect` out, optionally through `fn`. A vector is an instance of an invariant;
it does not argue, it records what must be true for one input.

One file per invariant, named after it, vectors stacked inside in the order a reader should meet them.

**A vector can only compare what the surface carries.** Whatever the adapter drops on the way out is
unspecified by the suite — not because it does not matter, but because no vector and no mutant can
reach it (§16.2).

### 11.1 Format

```yaml
invariant: PRICE-002
operation: price

vectors:
  - id: v1
    title: the discount is rounded once, on the subtotal
    fn: ops/whatWasSigned.mjs        # optional
    from: brief                      # optional, default brief
    given:
      lines: [ ... ]
      discountBps: 1250
    expect:
      subtotal: 6330
      discount: 791
      total: 5539
```

| field | required | meaning |
|---|---|---|
| `invariant` | yes | file-level. MUST equal the file name and a brief heading |
| `operation` | yes | file-level. Passed to the implementation as `operation` |
| `id` | yes | unique within the file. A position, not a name |
| `title` | yes | what this case asserts, in one line. A claim, not a label |
| `fn` | no | path to an op. Applied to the implementation's output before comparison |
| `from` | no | `brief` (default) or `code`. `code` means the case was observed, not claimed |
| `given` | yes | the input |
| `expect` | yes | the compared value. **Exact**; extra fields fail |

**Evaluation.** `value = implementation(given)`; if `fn` is present, `value = op(value)`;
pass iff `value` equals `expect` — deeply and exactly.

### 11.2 Parsing

Vectors are parsed by a strict YAML subset. Accepted:

- `#` comments from line start or after a space
- two-space indentation, mappings `key: value`
- sequences `- item`, including sequences of mappings
- inline arrays of scalars `[1, 2]`
- quoted strings, integers, decimals, `true`, `false`, `null`
- bare strings

Rejected: tabs, odd indentation, flow mappings `{a: 1}`, anchors, aliases, block scalars
(`|`, `>`), multiple documents, duplicate keys.

A file outside this subset MUST be reported as `PARSE`, never silently coerced. The subset is small on
purpose: every feature a general YAML parser brings is a way for two readers to see two suites.

### 11.3 Substitutions

`$given.<path>` and `$fixture.<name>` are the only substitutions permitted anywhere in a vector. Path
segments are dot-separated keys. No expressions, no functions, no arithmetic.

`$given.<path>` reads from the vector's own `given`.

`$fixture.<name>` reads a value from `conformance/fixtures/` (§15), named in `fixtures/manifest.yaml`.
Fixtures exist for values only a machine can produce — a signature, a public key, a timestamp — which
a vector author cannot invent and a vector must not compute.

### 11.4 Rules

- The file name MUST equal `invariant` (`FIELD`), and `invariant` MUST be a `###` heading in
  `BRIEF.md` (`ORPHAN-VECTOR`).
- `id` and `title` MUST both be present, and `id` MUST be unique within its file (`DUPLICATE`).
- An `id` MUST NOT be renumbered or reused once a verdict has cited it. Verdicts name vectors.
- `given` and `expect` MUST both be present. Omitting `expect` is not the same as expecting nothing.
- `expect` MUST be exact. Extra fields fail; there is no subset match and no tolerance.
- A vector MUST NOT be markable as skipped. The format has no `skip`, `todo` or expected-failure
  field: every vector expects pass, and a refusal is a pass because `expect` says so.

  That is the strongest rule available — one the format cannot express, and therefore cannot be talked
  round.
- `fn` MUST name a file that exists (`UNKNOWN-OP`).
- A vector whose `expect` was observed in an implementation MUST carry `from: code`.
- A `title` SHOULD state the claim in words that could be false. "rounds correctly" is a label; "the
  discount is rounded once, on the subtotal" is a claim.
- An invariant SHOULD have one to three vectors, at least one of them a refusal. The refusal is the
  cheap half of the claim and it is the half a builder skips.

---

## 12. Op

A projection. An op takes what the implementation returned and turns it into something a vector can
compare — because an implementation returns a credential with a signature in it, and no `expect` may
contain a signature a human typed.

The op is the only artefact that is judged before it is used for anything. Its own vectors live beside
it, in the same format as `vectors/` minus `invariant`, and they run at gate 4 with no implementation
in existence. That is what makes the op trustworthy at the moment a vector starts to depend on it.

Op density — how much of the return shape the brief left to the builder — is worth watching. Growing
it is a signal that the brief under-specified the operation, not a solution to it.

### 12.1 Format

```yaml
# ops/whatWasSigned.yaml
operation: whatWasSigned

vectors:
  - id: v1
    title: reports the algorithm the signer used, not the one in the header
    given: ...
    expect:
      alg: EdDSA
      hasSignature: true
```

`operation` names the executable: `ops/<operation>.mjs` or `ops/<operation>.php`.

### 12.2 Rules

- An op MUST be a pure function of its input. Two runs on the same input MUST return the same object.
  An op that reads the clock, the filesystem or a random source cannot be judged at gate 4 and MUST
  NOT be used as `fn`.
- An op named by a vector's `fn` MUST exist in `ops/` (`UNKNOWN-OP`).
- Every vector in an op's own file MUST pass, or the op MUST be reported `OP-BLIND`. An op that does
  not do what its own vectors say is projecting something nobody described, and every vector using it
  is then unreadable.
- An op MUST take the implementation's output and nothing else. It MUST NOT take options or modes; a
  variant is a new name.
- An op MUST NOT return a verdict. It transforms a payload into comparable data. An op that returns
  `true`/`false` is a defect in the operation's return shape, not an op.
- An op's own vectors MUST use exact equality only and MUST NOT name an `fn`. One level of projection;
  below it is data.
- An op MUST be a process satisfying §16.

---

## 13. Mutant

Mutant is the written form of a fear: this is how the code will fail, and somebody must keep asking whether it does. 

A builder cannot hold every class of failure in mind, and the classes that matter most — algorithm confusion, a replayed nonce, a key that belongs to nobody — are exactly the ones nobody thinks of unaided.

So a mutant is neither a test nor a candidate. It is a probe: a plausible wrong implementation, written down while the concern is fresh, that the suite must reject. 

`raised_by` records where the concern came from, not who typed the file. A surviving mutant is then a decision someone made and the suite failed to honour, and there is a name to ask.

### 13.1 Format

`conformance/mutants.yaml`:

```yaml
mutants:
  - name: ignorant mutant
    vector: ALL
    attacks: ignores stdin and returns a fixed answer
    file: mutants/constant.mjs
    raised_by: 0en

  - name: rounds each line individually
    vector: PRICE-002
    attacks: applies the discount to each line and rounds each line individually
    file: mutants/per-line.mjs
    raised_by: mutant-leader-v5
    kills: [ERR-001#v1, ERR-001#v2, RESOLVE-002#v4] # Attacks specific vectors
```

| field | required | meaning |
|---|---|---|
| `name` | yes | unique. The handle used in verdicts |
| `vector` | yes | the invariant attacked, or `ALL` |
| `attacks` | yes | the mechanism, in one line |
| `file` | yes | the executable |
| `raised_by` | yes | the author of the mutant. A human, writer, adversary, code-reviewer |
| `kills` | no | the vectors this mutant predicts it will fail: `[ERR-001#v1, RESOLVE-002#v4]`. Absent means every vector of `vector:`, and nothing else |

**`vector: ALL`** is the harness check: an implementation that ignores its input MUST fail
every vector of every invariant. A suite that reports `ok` with an `ALL` mutant passing is
broken.

### 13.2 Rules

- `name` MUST be unique (`DUPLICATE`) and MUST be the name a verdict repeats back.
- `vector` MUST be an invariant id in `BRIEF.md`, or `ALL`.
- `kills` MAY be declared when the mutant's reach is wider than its `vector:` — which happens
  whenever one promise is claimed in several invariants. Absent, the prediction is every vector of
  `vector:` and nothing else. The runner grades the prediction: failed on all of them is `KILLED`,
  failed on some is `MUTANT-PARTIAL`, failed outside them is `MUTANT-COLLATERAL`, failed on none is
  `MUTANT-SURVIVED`. Declaring a prediction is how an aim becomes falsifiable; it is not a way to
  choose which vectors count.
- A `kills` entry MUST name a vector that exists (`PREDICTION-STALE` otherwise). A prediction that
  survives a rewrite of the suite is a prediction nobody checked.
- `attacks` MUST name the mechanism, not the symptom. A line that could describe two different bugs
  cannot be diagnosed on the day the mutant survives.
- `raised_by` MUST be recorded. A surviving mutant is then a decision with a name attached.
- A surviving mutant MUST be reported `MUTANT-SURVIVED`. It is a defect in the suite, never in the
  mutant.
- A suite MUST NOT report `ok` while a `vector: ALL` mutant survives. That is not a blind suite, it is
  a broken harness.
- A mutant MUST be judged only against vectors of the operation it implements. A mutant implements one
  operation; running it over another's vectors reports collateral that is really "it does not
  implement that operation".
- A mutant aiming at an invariant that has no vectors yet MUST be skipped rather than reported
  survived. `MISSING-VECTOR` already covers the hole, and two codes for one hole is one too many.
- A mutant MUST be a plausible mistake. A mutant nobody would ever write proves nothing about a
  codebase, and costs the same to write as one that would.

### 13.3 The attack record

`conformance/attack.yaml`, appended once per adversary pass. A human managing a suite without a
filesystem has to parse what happened, and a claim about what was attacked should be checkable.

```yaml
passes:
  - pass: 2
    date: 2026-10-29
    agent: mutant-leader-v1
    saw_code: true
    mutants: [shift leading zero, wrap only zero]
    survived: [swallow defects]
    could_not_attack: |
      The rethrow half of GUARD-001: no input is a defect.
```

| field | required | meaning |
|---|---|---|
| `pass` | yes | integer, increasing. One entry per adversary pass |
| `date` | yes | when the pass ran |
| `agent` | yes | who held the adversary role |
| `saw_code` | yes | `true` or `false`. A blind pass is **recorded**, never assumed |
| `mutants` | yes | every mutant this pass added, by `name` |
| `survived` | no | the names the runner rejected nothing for |
| `could_not_attack` | no | prose: what could not be aimed at, and why |

- Every name in `mutants` MUST exist in `mutants.yaml`, and every mutant in the manifest MUST appear in
  the latest pass (`ATTACK-STALE`). The record and the manifest are one fact seen twice, and two
  copies can disagree.
- A name in `survived` MUST be one the runner agrees survived (`ATTACK-STALE`). A record that claims a
  kill it did not get is the one lie an adversary could tell, and this is where it is caught.

---

## 14. Questions

The record of an ambiguity, as data. One file, `questions.yaml`, because a question has a status and a
status can be checked. Prose cannot.

Ambiguity is discovered downstream. The writer holds the brief, so it is the **least** likely to notice
what the brief fails to say — the adversary notices when it cannot aim a mutant at a claim, and the
builder notices when it cannot build without guessing. A question records the readings; the brief is
where the answer goes.

**A question does not block a gate.** It is reported, not enforced: what is enforced is that every
question carries a status, and that nothing is `open` at release. The trade is deliberate — enforcement
moves from the format to the reviewer, who turns the PR down (Convention 2).

### 14.1 Format

```yaml
questions:
  - id: Q-003
    invariant: ISSUE-003
    status: open          # open | closed | postponed
    raised_by: adversary  # adversary, builder, reconstructor, human — never the writer
    raised_at: 3          # the gate the pass was in
    readings:
      - direct: refusal whenever the two key ids differ
      - resolved: acceptance when the document lists the key
    note: |
      Free prose. Why it matters, what it blocks, what each reading costs.
    closed_by: null       # writer | human; null while open
    closed_at: null
```

| field | required | meaning |
|---|---|---|
| `id` | yes | unique within the file |
| `invariant` | yes | the claim it is about; MUST be a brief heading |
| `status` | yes | `open`, `closed`, `postponed` |
| `raised_by` | yes | who could not proceed |
| `raised_at` | yes | the gate |
| `readings` | yes | two or more, each a name and what it would mean |
| `note` | no | prose: the cost of each reading, or why it is postponed |
| `closed_by` | on close | `writer` or `human` |
| `closed_at` | on close | the date |

### 14.2 Rules

- Anyone **but** the writer MAY raise a question. The writer MUST NOT raise one — it is holding the
  brief, and a question it asks itself is a decision it declined to make.
- A question is resolved by changing `BRIEF.md`. The record carries a `closed_by`, a date, and a
  pointer in `note`; it MUST NOT restate the resolution as a rule. A record that argues is a second
  source of truth, and the second one always wins because it is fresher.
- A question MAY stay `open` through any gate. It MUST NOT be `open` at release: by then somebody has
  answered it or declared it postponed, in writing.
- Nobody but the writer or the human may close a question. A question closed by the pass that raised it
  is a question answered by its accuser.
- The writer proposes the resolution; the human accepts the diff at the gate. The writer may edit the
  brief — it does not own it.

---

## 15. Fixture

A frozen value. Fixtures exist for values only a machine can produce — a signature, a public key, a
timestamp — which a vector author cannot invent and a vector must not compute.

A fixture is **read, never computed**. It is a file in the repository, produced once by a script that
was reviewed, and it does not move. A value that changes between runs is not a fixture: every `expect`
written against it silently means something else today than it did yesterday.

### 15.1 Format

```
fixtures/
  manifest.yaml     name → file, plus a sha256
  <name>.<ext>      the frozen value
```

```yaml
fixtures:
  - file: issued.json
    sha256: 9f2c...
```

A vector reaches a fixture as `$fixture.<name>`, where `<name>` is the file name without its
extension (§11.3).

### 15.2 Rules

- A fixture MUST be produced by a script that is committed alongside it, and MUST NOT be edited by
  hand. A hand-edited fixture is an expectation nobody can regenerate.
- The script MUST be deterministic. Running it twice MUST produce byte-identical files, or the digests
  below are theatre.
- `fixtures/manifest.yaml` SHOULD record a sha256 of each file.
- A file whose content does not match its recorded digest MUST be reported `FIXTURE-STALE`.
- A file named in the manifest but missing MUST be reported `PARSE`.
- A `$fixture.<name>` naming something the manifest does not list MUST NOT resolve to an empty value.
  It has to fail: a vector that quietly compares `null` is green for the wrong reason.

---

## 16. Executables

An implementation, an op and a mutant are the same kind of thing: a process. This is what makes the
runner language-agnostic — it never links anything, so it can hold no opinion about what it runs.

The process on the far side of the boundary is not always the implementation itself: for a library, an
**adapter** (§3) implements the surface and calls the code behind it.

```
stdin    one JSON object
stdout   one JSON object
```

### 16.1 Rules

- The implementation MUST receive `{ "operation": <string>, ...given }`.
- An op and a mutant MUST receive the object they are given, unchanged in shape.
- Exit codes MUST be ignored. Stdout is the answer: a process that exits non-zero after writing valid
  JSON has succeeded, and a process that exits zero after writing nothing has not.
- A stdout that is not one JSON object MUST fail the vector. Nothing is salvaged from it, and there is
  no partial credit: protocol chatter on stdout is how a run becomes unreadable.
- Refusal MUST be data. An operation expresses a refusal as a returned object. A thrown error is
  observable only if the brief declares it; when it does, the vector expresses it as
  `expect: { throws: <message> }`.
- An executable SHOULD NOT write to stderr either, except when it is a diagnostic someone will read.

### 16.2 The surface

**The suite is exactly as wide as the surface.** Everything that crosses it is claimable and
attackable. Everything that does not is unspecified by the suite — not because it does not matter, but
because no vector and no mutant can reach it.

**What the surface is.** Everything the suite owns at the boundary:

- the **brief** with its vectors, mutants and fixtures — the claim, and the cases that check it;
- the **adapter** — the writer's artefact, the only part of the suite that touches the code, and the
  thing that makes `runner judge` possible at all.

**What the surface is not.** The implementation and everything inside it: its source, its internal
types, its dependencies, the libraries it builds on. The runner never links any of it, and nothing in
the suite may name it.

Two very different things look like implementation detail from here, and only one of them is a limit
worth accepting:

| | example | verdict |
|---|---|---|
| **invisible and irrelevant** | whether the decoder uses a big integer type or a byte array; whether there is a cache; how the loop is written | accept it. No boundary behaviour changes, so there is nothing to claim |
| **invisible and relevant** | the error's class: an implementation that throws one type and one that throws another differ, and the suite currently cannot see it | not a limit — a **surface that is too narrow**, and a decision you can revisit |

The boundary is drawn by the brief, not by the language. An error class is invisible because the brief
chose to send the message and not the class; send both and the class becomes a claim like any other.

**An unvectorable claim is usually a surface defect, and the surface belongs to the writer.** Check
that the claim is outside the surface rather than merely outside its current shape. When it genuinely
cannot reach the code, it still has to be recorded — in the brief, under `## Unchecked obligations`
(§9.2), never as a `###` heading, because a heading with no vector is `MISSING-VECTOR`.

---

## 17. Verdicts

Two verbs, two shapes, one closed vocabulary each.

### 17.1 `runner suite`

Judges the suite.

```json
{ "verb": "suite", "ok": false,
  "violations": [ { "code": "MUTANT-SURVIVED", "at": "rounds each line individually" } ],
  "invariants": { "declared": 7, "covered": 3 },
  "mutants": { "total": 3, "killed": 2, "survived": 1 } }
```

Violation codes, closed set:

| code | meaning |
|---|---|
| `PARSE` | a file does not parse under §11.2 |
| `FIELD` | a required field is missing, unknown, or of the wrong kind |
| `MISSING-VECTOR` | an invariant has no vector |
| `ORPHAN-VECTOR` | a vector's invariant is not a brief heading |
| `DUPLICATE` | duplicate vector id or mutant name |
| `UNKNOWN-OP` | `fn` names a file that is not in `ops/` |
| `OP-BLIND` | an op fails a vector in its own file — the projection does not do what its vectors say |
| `UNFALSIFIABLE` | an invariant has no mutant aiming at it |
| `MUTANT-SURVIVED` | a mutant passed every vector of the invariant it attacks |
| `MUTANT-COLLATERAL` | a mutant failed a vector of an invariant it does not attack |
| `MUTANT-PARTIAL` | a mutant failed some of the vectors it predicted, but not all — the attack is weaker than declared |
| `PREDICTION-STALE` | `kills` names a vector that no longer exists |
| `ATTACK-STALE` | the attack record disagrees with the manifest or with what the runner observed |
| `FIXTURE-STALE` | a fixture file does not match the digest recorded in `fixtures/manifest.yaml` |

`ok` is `true` iff `violations` is empty.

### 17.2 `runner judge <command>`

Judges an implementation. No brief, no mutants: it compares executions against `expect`.

```json
{ "verb": "judge", "ok": false,
  "vectors": { "total": 6, "passed": 4 },
  "failures": [ { "vector": "PRICE-002#v1", "expect": { ... }, "actual": { ... } } ] }
```

### 17.3 Rules

- A verdict MUST be emitted to stdout as exactly one JSON object. Human-readable output MAY be emitted
  to stderr.
- A runner MUST use the codes above and no others. A new code is a change to this document, not an
  extension of a runner.
- `judge` MUST NOT consult the brief or the mutants. It answers one question: does this process do what
  the vectors say.
- `suite` MUST NOT run an implementation. Gate 4 exists because at that moment there is nothing to run.
- A runner MUST NOT write to the suite. It reads artefacts and emits a verdict; `conformance/` is
  read-only to it. The record of what survived is `attack.yaml` (§13.3), which the adversary writes and
  the runner merely checks.
- A runner MAY cache verdicts, keyed by a hash of the artefacts each verdict depends on — the mutant
  file, the vectors it is judged against, the ops it uses. The cache MUST live outside the suite, MUST
  NOT change any verdict, and a run with an empty cache MUST produce the same output as a run with a
  full one. The cache buys speed and a record of what changed; it never buys an answer.

The runner's prohibitions are the ones that keep it portable, and they are absolute:

- A runner MUST NOT know any domain word: `accepted`, `refused`, `valid`, `priced`. A word it
  recognises is a word it has an opinion about.
- A runner MUST NOT import or link the implementation.
- A runner MUST NOT accept a comparator, plugin or assertion library supplied by the suite. The
  comparison is `equal` and it is built in.
- A runner MUST NOT be generated per project. It is a shipped instrument; a per-project runner is a
  second implementation with no suite over it.

---

## 18. Attribution

A missed defect MUST be attributable by inspecting artefacts alone:

| cause | determination |
|---|---|
| no invariant covered it | no brief heading states it |
| invariant uncovered | `MISSING-VECTOR`, or every vector passes under a mutant aimed at it |
| vector blind | `MUTANT-SURVIVED`, no question raised against the invariant |
| claim ambiguous | `MUTANT-SURVIVED`, and `questions.yaml` named the invariant |
| builder error | `runner judge` red, suite `ok` |

---

## 19. TODO

Decisions the format has not made. These are not casualties of a rewrite and nothing here is a
typo to be fixed: each one is a claim the suite cannot currently express, or a rule whose
strength is still being argued. The restructure casualties were cleared on 30 Oct 2026 —
this table is now only what is open.

| # | what | why it is still open |
|---|---|---|
| 1 | **Composition** — a claim about two operations cannot be written | `publicKeyFromDidKey(didKeyFromPublicKey(k)) === k` is unexpressible: a vector names one op, and a `given`/`expect` pair has nowhere to hold an intermediate. The strongest promise in a package is usually exactly this shape, and three passes have walked into it. MUST NOT be solved by adding a composite op to the adapter, which tests the adapter. Recorded as `composition:` in `SUSPICIONS.md`. Address early; not before the rebuilds |
| 2 | A non-JSON stdout MUST be reported as `NOT-JSON` | `NOT-JSON` is not in the closed verdict set, and §16.1 says the vector fails without naming a code. A process that prints prose is a real and distinct failure; the question is whether it deserves a name or a `PARSE` |
| 3 | One to three vectors per invariant, at least one of them refused | a `MUST` in v0.2, softened to `SHOULD` in §11.4. Hardening it again makes a single-vector invariant a violation, which is a real cost given how short the suites currently are |
| 4 | `STRUGGLE.md` — one thread per claim, both voices in one place, appended forever | written and **not adopted**; kept as a separate document. It is the reviewer's artefact — what was attacked, what came back — and no one has read it yet. If nothing claims this job by v0.6, delete the file |

---
