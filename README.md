# Code Conformance Protocol


<p align="center">
  <img src="assets/img/code-conformance-logo.png" alt="Code Conformance Protocol" width="240">
</p>
<p align="center">
  <strong>Policy as the source of truth for the code</strong><br>
</p>

<p align="center"><a href="./SPEC.md">SPEC</a> v.0.7 / 
<a href="./SKILLS/README.md">SKILLS</a> /
<a href="./runner/README.md">Runner</a>
</p>

---

For decades, software development had a sacred lineage. It was a craft. An author’s intent was carefully debated, documented as a specification, painstakingly hand-written into code, and preserved in documentation. There was a theory in software you created, it was an act of creation. 

As a programmer, you were a digital craftsman. You owned what you made because you *wrote* it. It was your proficiency, your joy, and your ticket to self-realization. If you were a contributor to open-source, you were building the digital commons, carving out public spaces in the digital world with your own tools.

Then came the "AI-slop" storm.

Between 2021 and 2025, the lineage broke. What was once the joyous work of the human mind became a series of automated prompt-and-output pipelines. Programmers became review-monitors, then prompters, and finally, just operators. A slop-machine operator. The code, generated in infinite volume by massive, un-accountable models, lost its human voice. Open-source maintainers found themselves buried under avalanches of AI-generated Pull Requests—fast-food code that looked passable but often contained hidden rot, CVE vulnerability landmines, and subtle hallucinated bugs. 

The "dark stack" of the internet has grown replacement-heavy, fragile, and volatile.

* Attackers use AI to hunt down vulnerabilities at speeds humans cannot match.
* Humans are deskilled, suffering an identity crisis as their craftsmanship is replaced by high-throughput code generation.
* The "soul" of software is being lost somewhere inside the massive server farms. Nobody "owns" the code, yet everything depends on it
* Tools became the idea. We no longer invent, we jump between the hype trains looking for problems.

We are living in an era where software has stopped being built out of enduring standards and has instead become a sprawling, unstable dump of disposable code. Unverified, unpredictable, unauthorised.

**How do we find our way back to truth?**

[Read more](./MANIFESTO.md)

---

## Runner

```bash
# Install
npm i -D conformance-runner@0.7.2

conformance-runner suite                 # judge the suite. No implementation involved.
conformance-runner judge <command>       # judge an implementation against the suite.
conformance-runner suite --suite path    # somewhere other than ./conformance
```

Scripts:

```json
"scripts": {
  "conform": "conformance-runner suite && conformance-runner judge conformance/implementation.mjs",
  "conform:save": "conformance-runner suite --save && conformance-runner judge conformance/implementation.mjs --save"
}
```

Both verdicts are one JSON object on stdout. `ok` is true only when there are no violations.

---
## Experiments

**DID Library Conformance Experiment**

Five builders, one suite. This folder holds the implementations, the
verdicts and the builders' own accounts, so that a claim about the protocol can be checked later against files instead of memory.

[Read more](./did-conformance-experiment)

---
Maintainers: 
[Oen](anton@synthetism.ai)

  
MIT.
