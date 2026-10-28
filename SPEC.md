# Intent Conformance Protocol

**Version 0.1 · 25.10.26 · syntax and constraints only**
**Version 0.2 · 28.10.26 · The loop, roles, acl, conventions, mutants**

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
| **suite** | A `conformance/` directory containing a brief, vectors, mutants, ops, fixtures  |
| **brief** | Prose. Declares invariants. Its `###` headings are invariant ids. Never parsed beyond its headings. |
| **invariant** | A falsifiable claim about an operation. Heading form: `### ID — statement`. |
| **vector** | One case. `given` → `expect`, optionally through `fn`. |
| **op** | A projection. A process that transforms an implementation's output into comparable data. |
| **mutant** | An implementation that is deliberately wrong in one declared way. Generated, never authored. |
| **runner** | A process producing verdicts about a suite or about an implementation. |
| **implementation** | A process under test. |
| **finding** | Code-review feedback  |

... fixture, 

finding ? 


---

## 4. The loop

Gates are ordered. A gate MUST NOT be passed with an open violations.

| # | gate | entry | exit |
|---|---|---|---|
| 1 | brief | prompt, sources | human accepted the brief **after changing it** |
| 2 | invariants + vectors + ?mutants | brief | writer delivered |
| 3 | mutants | brief, vectors | adversary delivered |
| 4 | suite | 1–3 | `runner suite` → `ok: true`. **No implementation exists** |
| 5 | build | brief, suite | builder delivered |
| 6 | judge | suite, implementation | `runner judge` → `ok: true`, after being red |
| 7 | attack again | verdict, suite | new mutants; return to 4 |
| 8 | pre-release | 4–7 |  suite |

----
| 10 | code-review | 4–7 |  suite |
| 11 | release | 4–7 | immutable suite |
---

Gate 4 with no implementation is the point of the protocol: the suite is verified against
mutants before there is code to explain it.

Gate 1 requires a **change**, not an approval. An accepted brief that was not edited was not read.

---

## 4. Roles

Reads/writes vector - human at the top, explicitly points human as the author and maintainer of the document. 

| role | reads | writes | MUST NOT read | 
|---|---|---|---|
| **human** | suite | brief | — | 
| **writer** | suite | suite | builder reasoning | 
| **adversary** | brief, vectors | mutants | - |
| **builder** | suite | implementation | — |
| **runner** | suite, implementation | verdicts | brief prose (except `###` headings) | 
| **reviewer** | suite, verdicts | findings | — |

## 5. ACL

| role | brief  | vectors | mutants | ops | fixtures | implementation | verdicts |
|---|---|---|---|---|---|---|---|---|
| **programmer** | rw | rw | rw | rw | rw | rw | r |
| **writer** | rw | rw | rw | rw | rw | r | r |
| **builder** | r | r | r | r | r | rw | r |
| **reviewer** | r | r | r | r | r | r | rw |
| **runner** | h | r | r | r | r | r | w |

`r` read · `w` write · `0` never · `h` headings only, never pro


## 6. Conventions

### 6.0 Suite

A suite MUST 

- MUST be the source of truth, not the implementation. If Suite changes, it affects the code. Code changes never moves the suite.
- MUST HAVE at least one invariant, one vector and one mutant

A suite MUST NOT:

- mark a vector `skip`, `todo` or expected-failure. Every vector expects pass. A refusal is a
  pass because `expect` says so
- contain a vector whose `expect` was produced by running the implementation
- contain an op that returns a verdict

### 6.1 Roles

**Every role** 

- MUST BE a context state, not a different agent.
- One assistant MAY satisfy several roles provided it enters each having

**Human** 

- MUST BE the author, owner and accountable for the suite maintenance. 
- MUST BE the judge of all arfefacts 
- MUST run implementation with runner and sign-off the implementation.

**Writer**

- The writer MAY read the implementation.
- The writer MUST NOT derive expect from observed behaviour. An expected value comes from a claim, never from a run.

**Runner**:

- know any domain word (`accepted`, `refused`, `valid`, `priced`, …)
- import or link the implementation
- read brief prose beyond `###` headings
- be generated per project; it is a shipped instrument
- accept a comparator, plugin or assertion library from the suite

### 6.3 Arefacts 

#### Brief

- The brief MUST be changed at gate 1, not merely approved.
- MUST HAVE Intent 
- MUST HAVE at least one invariant
- Each invariant heading MUST contain a statement that can be false.
- The brief SHOULD contain an out-of-scope section. It is the risk register: the classes of failure knowingly not covered.
- The brief SHOULD contain a decisions section: one row per opinionated choice, the alternative not taken, and what the choice costs. A decisions section that records no cost is advocacy.


#### Invariant

- An invariant id MUST match `^[A-Z][A-Z0-9]*(-[0-9]{3})$`.
- Every invariant MUST have at least one vector, and every vector's invariant MUST be a heading.
- An invariant with no mutant aimed at it MUST be reported `UNFALSIFIABLE`.

#### Vector

- One to three vectors per invariant, at least one of them refused.
- At most one op per invariant.
- A vector's `expect` MUST be the complete value; extra fields fail.

---
todo:
- A vector's `expect` MUST NOT be produced by running the implementation.

- A vector MUST NOT invoke the implementation to compute any part of its own `expect`.
---

####  Mutant

- MUST HAVE owners. Whoever sees an attack writes it down immediately. 
- A mutant MUST be caught by at least one vector of the invariant it attacks, and MUST disturb no
  other.
- A mutant MUST be a plausible mistake. A mutant nobody would ever write proves nothing about a
  codebase.

### Ops

- Op density measures how much of the return shape the brief left to
  the builder — growing it is a signal, not a solution.
  records who did, so no field is needed for it.
- An op MUST NOT return a verdict.
- An op MUST be a process satisfying §10.
- An op MUST take the implementation's output and nothing else. It MUST NOT take options or
  modes; a variant is a new name.
- An op MUST NOT return a verdict. It transforms a payload into comparable data. An op that
  returns `true`/`false` is a defect in the operation's return shape, not an op.
- Ops are subject to the suite. An op's vectors MUST use `equal` only and MUST NOT name an
  `fn`. One level of projection; below it is data.

## Fixture

- Every fixture MUST match the digest in its manifest.

## Executables

- Every executable MUST read one JSON object and write one.

---

## 7. Layout

```
conformance/
  BRIEF.md
  QUESTIONS.md                   open ambiguity. Empty at gate 4.
  vectors/
    <INVARIANT-ID>.yaml          one file per invariant
  mutants.yaml                   manifest
  mutants/
    <name>.mjs | <name>.php      mutant executables
  ops/
    <name>.mjs | <name>.php      op executables
  fixtures/
    manifest.yaml                name → file, plus a digest
    <name>.json                  frozen values, produced by a reviewed script
```

`<INVARIANT-ID>` MUST equal a `### ID` heading in `BRIEF.md`.

---

## 8. Vector

## 8.1. Vector syntax

Vectors are parsed by a strict YAML subset. Accepted:

- `#` comments from line start or after a space
- two-space indentation, mappings `key: value`
- sequences `- item`, including sequences of mappings
- inline arrays of scalars `[1, 2]`
- quoted strings, integers, decimals, `true`, `false`, `null`
- bare strings

Rejected: tabs, odd indentation, flow mappings `{a: 1}`, anchors, aliases, block scalars
(`|`, `>`), multiple documents, duplicate keys.

A file outside this subset MUST be reported as `PARSE`, never silently coerced.

### 8.2 Vector format

```yaml
invariant: PRICE-002
operation: price

vectors:
  - id: v1
    title: the discount is rounded once, on the subtotal
    fn: ops/whatWasSigned.mjs        # optional
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
| `title` | yes | what this case asserts, in one line |
| `fn` | no | path to an op. Applied to the implementation's output before comparison |
| `given` | yes | the input |
| `expect` | yes | the compared value. **Exact**; extra fields fail |

**Evaluation.** `value = implementation(given)`; if `fn` is present, `value = op(value)`;
pass iff `value` equals `expect`.

**`$given.<path>`** and **`$fixture.<name>`** are the only substitutions permitted anywhere in a
vector. Path segments are dot-separated keys. No expressions, no functions, no arithmetic.

`$given.<path>` reads from the vector's own `given`.

`$fixture.<name>` reads a value from `conformance/fixtures/`, named in `fixtures/manifest.yaml`.
Fixtures exist for values only a machine can produce — a signature, a public key, a timestamp —
which a vector author cannot invent and a vector must not compute. A fixture is **read, never
computed**: it is a frozen file, and a fixture whose content changes between runs is not a
fixture. The manifest SHOULD record a digest of each file; a mismatch MUST be reported as
`FIXTURE-STALE`.



---


## 9. Mutant

Mutant is a villan, an anti-hero, a perpetrator, but it isn't bad - it has a purpose - making the resulting code more secure. It's a role-play, a cosplay for a programmer, to change the view from a defender, to attacker. We no longer have to defend the code as it's written by the builder. Mutants becomes the way we challenge the builder, creating constrains and attack vectors that should not exist.

> "There's no code, the code is a result of the suite."

A mutant exists to remember. It is the written form of a fear: this is how the code will fail, and somebody must keep asking whether it does. 

A builder cannot hold every class of failure in mind, and the classes that matter most — algorithm confusion, a replayed nonce, a key that belongs to nobody — are exactly the ones nobody thinks of unaided.

So a mutant is neither a test nor a candidate. It is a probe: a plausible wrong implementation, written down while the concern is fresh, that the suite must reject. 

`raised_by` records where the concern came from, not who typed the file. A surviving mutant is then a decision someone made and the suite failed to honour, and there is a name to ask.

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
```

| field | required | meaning |
|---|---|---|
| `name` | yes | unique. The handle used in verdicts |
| `vector` | yes | the invariant attacked, or `ALL` |
| `attacks` | yes | the mechanism, in one line |
| `file` | yes | the executable |
| `raised_by` | yes | the author of the mutant. A human, writer, adversary, code-reviewer |
| `observed` | no | written by the runner (§11). MUST NOT be hand-written |

**`vector: ALL`** is the harness check: an implementation that ignores its input MUST fail
every vector of every invariant. A suite that reports `ok` with an `ALL` mutant passing is
broken.

---

## 10. Process contract

An implementation, an op and a mutant are the same kind of thing.

```
stdin    one JSON object
stdout   one JSON object
```

- The implementation receives `{ "operation": <string>, ...given }`.
- Ops and mutants receive the object they are given, unchanged in shape.
- Exit codes MUST be ignored. Stdout is the answer.
- A non-JSON stdout MUST be reported as `NOT-JSON`.
- Refusal is data. An operation MUST express a refusal as a returned object. A thrown error
  is observable only if the brief declares it; when it does, the vector expresses it as
  `expect: { throws: <message> }`.

---

## 11. Verdicts

`runner suite` — judges the suite. No implementation.

```json
{ "verb": "suite", "ok": false,
  "violations": [ { "code": "MUTANT-SURVIVED", "at": "rounds each line individually" } ],
  "mutants": { "total": 3, "killed": 2, "survived": 1 } }
```

Violation codes, closed set:

| code | meaning |
|---|---|
| `PARSE` | a file does not parse under §12 |
| `FIELD` | a required field is missing, unknown, or of the wrong kind |
| `MISSING-VECTOR` | an invariant has no vector |
| `ORPHAN-VECTOR` | a vector's invariant is not a brief heading |
| `DUPLICATE` | duplicate vector id or mutant name |
| `UNKNOWN-OP` | `fn` names a file that is not in `ops/` |
| `UNFALSIFIABLE` | an invariant has no mutant aiming at it |
| `MUTANT-SURVIVED` | a mutant passed every vector of the invariant it attacks |
| `MUTANT-COLLATERAL` | a mutant failed a vector of an invariant it does not attack |
| `MANIFEST-STALE` | recorded `observed` differs from the observed result |
| `FIXTURE-STALE` | a fixture file does not match the digest recorded in `fixtures/manifest.yaml` |

`ok` is `true` iff `findings` is empty.

`runner judge <command>` — judges an implementation. No brief, no mutants.

```json
{ "verb": "judge", "ok": false,
  "vectors": { "total": 6, "passed": 4 },
  "failures": [ { "vector": "PRICE-002#v1", "expect": { ... }, "actual": { ... } } ] }
```

Both verdicts MUST be emitted to stdout as one JSON object. Human-readable output MAY be
emitted to stderr.

---

## 12. Attribution

A missed defect MUST be attributable by inspecting artefacts alone:

| cause | determination |
|---|---|
| no invariant covered it | no brief heading states it |
| invariant uncovered | `MISSING-VECTOR`, or every vector passes under a mutant aimed at it |
| vector blind | `MUTANT-SURVIVED` |
| builder error | `runner judge` red, suite `ok` |

---
