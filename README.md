# Code Conformance Runner

A runner for the **[Code Conformance Protocol](./SPEC.md) 0.2**.

The protocol is a way to check code nobody can read. Instead of reviewing a diff, you state what
must be true in a **brief**, write **vectors** that check it case by case, and write **mutants** —
plausible wrong implementations — to prove the vectors bite. A runner never links or imports an
implementation: everything it executes is a process taking one JSON object and returning one. That
is why the same runner judges a suite written in any language, and why it can judge the suite before
any implementation exists.

## Commands

```bash
conformance-runner suite                 # judge the suite. No implementation involved.
conformance-runner judge <command>       # judge an implementation against the suite.
conformance-runner suite --suite path    # somewhere other than ./conformance
```

Both verdicts are one JSON object on stdout. `ok` is true only when there are no violations.

MIT.
