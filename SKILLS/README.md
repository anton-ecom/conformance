# Code Conformance: SKILLS

SKILLS represent 4 roles from the [SPEC](../SPEC.md)

## RECONSTRUCTOR

Created a `speciment` - a reconstructed conformance suite from the code. 

## WRITER

Author's assistant, updating the BRIEF, writing invariants, vectors, fixtures, adapter. Defends against ADVERSARY.

**Never reads the code, never writes the code.**

## ADVERSARY

Attacks the suite blind, attacks the suite with code access. Writes mutants. Writes `questions.yaml`.

## BUILDER

Reads the suite. Updates or writes the code. Writes `questions.yaml`.

**Never writes the suite**

---
See detailed breakdown of permissions §6 ACL in the [SPEC](../SPEC.md)

