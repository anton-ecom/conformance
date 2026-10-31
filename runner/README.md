# conformance-runner

The instrument. It judges a suite, and it judges an implementation against a suite.

It knows nothing about your domain. It spawns processes, compares JSON, and reports. Everything it
runs — an implementation, an op, a mutant — is the same kind of thing: one JSON object in, one out.

```bash
npx -y conformance-runner@0.6 suite       # no install, pinned to the spec you follow
conformance-runner suite                  # judge the suite. No implementation involved.
conformance-runner judge <command>        # judge an implementation against the suite.
conformance-runner suite --suite path     # somewhere other than ./conformance
conformance-runner suite --save           # also keep the verdict, beside the suite
```

The verdict is one JSON object on stdout. `ok` is true only when there are no violations, and the
exit code follows it.

**The version tracks the protocol.** `conformance-runner@0.6` implements spec 0.6, and nothing else.
A suite declares which spec it follows in `conformance/suite.yaml`, and the runner refuses to judge
across a mismatch rather than produce a verdict from rules that do not apply:

```
this suite declares spec 0.7. This runner implements spec 0.6.
No verdict: it would be produced by rules this suite was not written against.
```

So pin `~0.6.0` in a project whose suite says `spec: "0.6"`. Every verdict carries both numbers back.

## What it checks

`suite` never touches an implementation, so it works before any code exists:

- every invariant in the brief has a vector, and every vector's invariant is a heading
- every file parses under the strict YAML subset
- every fixture matches the digest in its manifest
- every op is judged against its own vectors — an op is a process, so it can be tested here
- every mutant is rejected by at least one vector of the invariant it attacks, and disturbs no other
- every invariant that has vectors is attacked by at least one mutant

`judge` runs the vectors against a command and reports which ones failed and why.

## Design rule

The runner MUST NOT know a domain word, import an implementation, accept a comparator or plugin from
a suite, or be generated per project. An instrument a suite can shape is not an instrument.
