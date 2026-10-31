#!/usr/bin/env node
// The runner. An instrument, not part of the suite.
//
//   node runner.mjs suite                    judge the suite. No implementation involved.
//   node runner.mjs judge <command>          judge an implementation against the suite.
//
// It knows nothing about credentials, prices, or any other domain word. It spawns processes,
// compares JSON, and reports. Every executable it runs — an implementation, an op, a mutant — is
// the same kind of thing: one JSON object in, one JSON object out.

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative, resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { parseYaml } from "./lib/yaml.mjs";

// The suite is not part of this package — it belongs to whatever project is being judged. So it is
// found relative to where the command was run, not relative to where the runner is installed.
const argv = process.argv.slice(2);
const suiteFlag = argv.indexOf("--suite");
const suiteArg = suiteFlag > -1 ? argv.splice(suiteFlag, 2)[1] : undefined;
const SUITE = resolve(process.env.CONFORMANCE_SUITE ?? suiteArg ?? "conformance");

// `--save` keeps the verdict somewhere a human can look at it. The default lives beside the suite,
// never inside it: a runner that writes into the directory it judges has stopped being a reader.
const saveFlag = argv.indexOf("--save");
let saveArg;
if (saveFlag > -1) {
  const next = argv[saveFlag + 1];
  saveArg = next && !next.startsWith("--") ? argv.splice(saveFlag, 2)[1] : argv.splice(saveFlag, 1) && true;
}

// Who is judging, and against which document. The spec version is a fact about this file, not about a
// suite, so it is declared here and travels in every verdict (§17.3).
const RUNNER = await readFile(new URL("./package.json", import.meta.url), "utf8")
  .then((body) => JSON.parse(body).version)
  .catch(() => "unknown");
const SPEC = "0.6";

const majorMinor = (version) => String(version).split(".").slice(0, 2).join(".");

// A suite says which version of this document it follows, and it has to be the version this runner
// implements. A verdict produced by the wrong rules is worse than no verdict at all: it looks like an
// answer (§8.2). So a mismatch stops the run instead of being reported as a finding.
async function checkIdentity() {
  let body;
  try {
    body = await readFile(join(SUITE, "suite.yaml"), "utf8");
  } catch {
    note("FIELD", "suite.yaml", "missing: the suite does not say which version of the protocol it follows");
    return;
  }
  let doc;
  try {
    doc = parseYaml(body);
  } catch (error) {
    note("PARSE", "suite.yaml", String(error.message).split("\n")[0]);
    return;
  }
  if (!doc?.spec) {
    note("FIELD", "suite.yaml", 'missing "spec"');
    return;
  }
  // Who owns the suite. `reconstructor` is the honest value for a suite nobody has claimed yet: the
  // specimen state, where a green run means the code was pinned to itself and nothing more (§3, §4).
  if (!doc.owner) note("FIELD", "suite.yaml", 'missing "owner"');
  if (majorMinor(doc.spec) !== majorMinor(SPEC)) {
    process.stderr.write(
      `this suite declares spec ${doc.spec}. This runner implements spec ${SPEC}.\n` +
        `No verdict: it would be produced by rules this suite was not written against.\n` +
        `Pin a runner at spec ${majorMinor(doc.spec)}, or migrate the suite to ${majorMinor(SPEC)}.\n`,
    );
    process.exit(2);
  }
  return doc.owner ?? null;
}

async function save(verdict) {
  const dir = resolve(
    saveArg === true || saveArg === undefined ? join(dirname(SUITE), ".conformance-runs") : saveArg,
  );
  const inside = relative(SUITE, dir);
  if (inside && !inside.startsWith("..")) {
    process.stderr.write(`not saving into the suite itself: ${dir}\n`);
    return;
  }
  await mkdir(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = join(dir, `${verdict.verb}-${stamp}.json`);
  await writeFile(file, `${JSON.stringify(verdict, null, 2)}\n`);
  process.stderr.write(`saved ${file}\n`);
}

// --- plumbing ---------------------------------------------------------------------------

const violations = [];
const note = (code, at, detail) => violations.push(detail ? { code, at, detail } : { code, at });

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function list(dir, ext) {
  try {
    return (await readdir(dir)).filter((f) => f.endsWith(ext)).sort();
  } catch {
    return [];
  }
}

function run(command, input) {
  return new Promise((done) => {
    const child = spawn(process.execPath, [command], { stdio: ["pipe", "pipe", "pipe"] });
    let out = "";
    let err = "";
    child.stdout.on("data", (c) => (out += c));
    child.stderr.on("data", (c) => (err += c));
    child.on("close", () => {
      try {
        done({ ok: true, value: JSON.parse(out) });
      } catch {
        done({ ok: false, error: (err.trim() || out.trim() || "no output").split("\n")[0] });
      }
    });
    child.stdin.end(JSON.stringify(input));
  });
}

// --- substitutions ----------------------------------------------------------------------

let fixtures = {};

async function resolveValue(value, given) {
  if (typeof value === "string") {
    if (value.startsWith("$fixture.")) {
      const name = value.slice("$fixture.".length);
      if (!(name in fixtures)) throw new Error(`no fixture "${name}"`);
      return fixtures[name];
    }
    if (value.startsWith("$given.")) {
      let at = given;
      for (const part of value.slice("$given.".length).split(".")) {
        at = at?.[part];
      }
      return at;
    }
    return value;
  }
  if (Array.isArray(value)) return Promise.all(value.map((v) => resolveValue(v, given)));
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = await resolveValue(v, given);
    return out;
  }
  return value;
}

// --- loading ----------------------------------------------------------------------------

async function loadFixtures() {
  const dir = join(SUITE, "fixtures");
  const manifestPath = join(dir, "manifest.yaml");
  let manifest;
  try {
    manifest = parseYaml(await readFile(manifestPath, "utf8"));
  } catch {
    note("PARSE", "fixtures/manifest.yaml");
    return;
  }
  for (const entry of manifest?.fixtures ?? []) {
    const body = await readFile(join(dir, entry.file), "utf8").catch(() => null);
    if (body === null) {
      note("PARSE", `fixtures/${entry.file}`, "named in the manifest but missing");
      continue;
    }
    if (entry.sha256) {
      const digest = createHash("sha256").update(body).digest("hex");
      if (digest !== entry.sha256) note("FIXTURE-STALE", `fixtures/${entry.file}`);
    }
    fixtures[entry.file.replace(/\.json$/, "")] = JSON.parse(body);
  }
}

async function loadQuestions(declared) {
  let body;
  try {
    body = await readFile(join(SUITE, "questions.yaml"), "utf8");
  } catch {
    return 0; // absent is legal: a suite may carry no questions at all (§14.2)
  }
  let doc;
  try {
    doc = parseYaml(body);
  } catch (error) {
    note("PARSE", "questions.yaml", String(error.message).split("\n")[0]);
    return 0;
  }
  const list = doc?.questions;
  if (list === undefined) return 0;
  if (!Array.isArray(list)) {
    note("FIELD", "questions.yaml", '"questions" is not a sequence');
    return 0;
  }

  // The runner checks that a record has a shape. It never reads what a message says — that is a
  // person's job, and the one thing this file exists for (§6.1, §14).
  const seen = new Set();
  for (const q of list) {
    const at = `questions.yaml#${q?.id ?? "?"}`;
    for (const field of ["id", "invariant", "status", "raised_by", "messages"]) {
      if (!q?.[field]) note("FIELD", at, `missing "${field}"`);
    }
    if (q?.id) {
      if (seen.has(q.id)) note("DUPLICATE", at, "id used twice");
      seen.add(q.id);
    }
    if (q?.status && q.status !== "open" && q.status !== "closed") {
      note("FIELD", at, `status "${q.status}"`);
    }
    if (q?.invariant && q.invariant !== "none" && !declared.includes(q.invariant)) {
      note("FIELD", at, `invariant "${q.invariant}" is not a brief heading`);
    }
    if (q?.messages !== undefined && (!Array.isArray(q.messages) || q.messages.length === 0)) {
      note("FIELD", at, '"messages" must be a non-empty sequence');
    }
  }
  return list.filter((q) => q?.status === "open").length;
}

// The attack record is checked, never trusted: a record and the manifest are one fact seen twice, and
// two copies can disagree. This is the only place the one lie an adversary could tell gets caught.
async function checkAttack(manifest, survived) {
  let body;
  try {
    body = await readFile(join(SUITE, "attack.yaml"), "utf8");
  } catch {
    return; // absent is legal (§13.3)
  }
  let doc;
  try {
    doc = parseYaml(body);
  } catch (error) {
    note("PARSE", "attack.yaml", String(error.message).split("\n")[0]);
    return;
  }
  const records = doc?.records;
  if (records === undefined) return;
  if (!Array.isArray(records)) {
    note("FIELD", "attack.yaml", '"records" is not a sequence');
    return;
  }

  const names = new Set(manifest.map((m) => m.name));
  for (const r of records) {
    const at = `attack.yaml#${r?.id ?? "?"}`;
    for (const field of ["id", "date", "mutant", "agent", "read", "status"]) {
      if (!r?.[field]) note("FIELD", at, `missing "${field}"`);
    }
    if (r?.read && r.read !== "blind" && r.read !== "code") note("FIELD", at, `read "${r.read}"`);
    if (r?.status && r.status !== "open" && r.status !== "closed") {
      note("FIELD", at, `status "${r.status}"`);
    }
    if (r?.status === "closed" && !r.answer) note("FIELD", at, 'a closed record needs an "answer"');
    if (!r?.mutant) continue;
    if (!names.has(r.mutant)) {
      note("ATTACK-STALE", r.mutant, "not a name in mutants.yaml");
    } else if (r.status === "closed" && survived.has(r.mutant)) {
      note("ATTACK-STALE", r.mutant, "recorded as closed, but the suite still lets it through");
    }
  }
}

async function loadVectorFile(path, { requireInvariant }) {
  const where = relative(SUITE, path);
  let body = "";
  let doc;
  try {
    body = await readFile(path, "utf8");
    doc = parseYaml(body);
  } catch (error) {
    note("PARSE", where, String(error.message).split("\n")[0]);
    return null;
  }

  if (!doc || typeof doc !== "object") return note("FIELD", where, "not a mapping"), null;
  if (!doc.operation) return note("FIELD", where, 'missing "operation"'), null;
  if (requireInvariant && !doc.invariant) return note("FIELD", where, 'missing "invariant"'), null;
  if (!Array.isArray(doc.vectors) || doc.vectors.length === 0) {
    return note("FIELD", where, 'missing or empty "vectors"'), null;
  }

  const seen = new Set();
  for (const v of doc.vectors) {
    const at = `${where}#${v?.id ?? "?"}`;
    if (!v?.id || !v?.title) note("FIELD", at, "needs id and title");
    else if (seen.has(v.id)) note("DUPLICATE", at, "id used twice");
    else seen.add(v.id);
    if (!("given" in (v ?? {}))) note("FIELD", at, 'missing "given"');
    if (!("expect" in (v ?? {}))) note("FIELD", at, 'missing "expect"');
    if (v?.fn && !(await readFile(join(SUITE, v.fn)).catch(() => null))) note("UNKNOWN-OP", at, v.fn);
  }

  // A vector may only name a fixture the manifest lists (§15.2). Checked here rather than at judge
  // time, because it is a defect in the suite and gate 4 has to catch it with no implementation.
  for (const [, name] of body.matchAll(/\$fixture\.([A-Za-z0-9_.-]+)/g)) {
    if (!(name in fixtures)) note("FIELD", where, `no fixture "${name}"`);
  }
  return doc;
}

function invariantIds(brief) {
  return [...brief.matchAll(/^###\s+([A-Z][A-Z0-9]*-\d{3})\b/gm)].map((m) => m[1]);
}

// --- judging one vector ----------------------------------------------------------------

async function judgeVector(subject, vector) {
  let given;
  let expected;
  try {
    given = await resolveValue(vector.given, vector.given);
    expected = await resolveValue(vector.expect, given);
  } catch (error) {
    // A vector that names something the suite does not have fails itself. It must never take the
    // whole run down with it (§15.2): one unreadable case is a finding, not the end of the file.
    return { pass: false, why: String(error.message).split("\n")[0] };
  }

  const first = await run(subject, { operation: vector.operation, ...given });
  if (!first.ok) return { pass: false, why: `did not produce JSON: ${first.error}` };

  let value = first.value;
  if (vector.fn) {
    const projected = await run(join(SUITE, vector.fn), value);
    if (!projected.ok) return { pass: false, why: `op ${vector.fn}: ${projected.error}` };
    value = projected.value;
  }
  if (isDeepStrictEqual(value, expected)) return { pass: true };
  return { pass: false, why: `expected ${JSON.stringify(expected)} got ${JSON.stringify(value)}` };
}

// --- suite ------------------------------------------------------------------------------

async function suite() {
  await loadFixtures();
  const owner = await checkIdentity();

  const brief = await readFile(join(SUITE, "BRIEF.md"), "utf8").catch(() => "");
  const declared = invariantIds(brief);
  const covered = new Map();

  // Vectors of the implementation, one file per invariant.
  const vectorDir = join(SUITE, "vectors");
  const vectorDocs = new Map();
  for (const file of await list(vectorDir, ".yaml")) {
    const doc = await loadVectorFile(join(vectorDir, file), { requireInvariant: true });
    if (!doc) continue;
    if (doc.invariant !== file.replace(/\.yaml$/, "")) {
      note("FIELD", `vectors/${file}`, "invariant does not match the file name");
    }
    if (!declared.includes(doc.invariant)) note("ORPHAN-VECTOR", `vectors/${file}`, doc.invariant);
    vectorDocs.set(doc.invariant, doc);
    covered.set(doc.invariant, (covered.get(doc.invariant) ?? 0) + doc.vectors.length);
  }
  for (const id of declared) if (!covered.has(id)) note("MISSING-VECTOR", id);

  // Ops are executables too, so they are judged here — no implementation is needed for that.
  const ops = new Map();
  const opsDir = join(SUITE, "ops");
  const opFiles = new Set((await list(opsDir, ".mjs")).map((f) => f.replace(/\.mjs$/, "")));
  for (const file of await list(opsDir, ".yaml")) {
    const doc = await loadVectorFile(join(opsDir, file), { requireInvariant: false });
    if (!doc) continue;
    if (!opFiles.has(doc.operation)) {
      note("UNKNOWN-OP", `ops/${file}`, `no executable for "${doc.operation}"`);
      continue;
    }
    ops.set(doc.operation, doc);
    for (const vector of doc.vectors) {
      const result = await judgeVector(join(opsDir, `${doc.operation}.mjs`), {
        ...vector,
        operation: doc.operation,
      });
      if (!result.pass) note("OP-BLIND", `ops/${file}#${vector.id}`, result.why);
    }
  }

  // Mutants are implementations, so the kill check works before any real code exists.
  //
  // Two guards, both learned by running this:
  //  - a mutant implements *one* operation, so it is only judged against vectors of that operation.
  //    Running a `verify` mutant over `issue` vectors reports collateral that is really just "it
  //    does not implement issue".
  //  - a mutant whose target has no vectors yet cannot be judged at all. That is MISSING-VECTOR's
  //    business, not the mutant's, so it is skipped rather than reported as survived.
  let mutantManifest;
  try {
    mutantManifest = parseYaml(await readFile(join(SUITE, "mutants.yaml"), "utf8"));
  } catch {
    mutantManifest = { mutants: [] };
  }
  const aims = new Set();

  const worked = (mutantManifest?.mutants ?? []).filter((m) => {
    if (m.vector === "ALL") return vectorDocs.size > 0;
    aims.add(m.vector);
    return vectorDocs.has(m.vector);
  });

  const mutants = { total: worked.length, killed: 0, survived: 0 };
  const survivedNames = new Set();
  for (const mutant of worked) {
    const targets = mutant.vector === "ALL" ? [...vectorDocs.keys()] : [mutant.vector];
    const operations = new Set(
      targets.filter((id) => vectorDocs.has(id)).map((id) => vectorDocs.get(id).operation),
    );

    const file = join(SUITE, mutant.file);
    if (!(await readFile(file).catch(() => null))) {
      note("FIELD", mutant.name, `no executable at ${mutant.file}`);
      continue;
    }

    // A prediction is what makes an aim falsifiable. Absent, nothing is predicted beyond "some
    // vector of `vector:` rejects it, and nothing outside does" — so MUTANT-PARTIAL cannot apply,
    // because nothing was declared to be partial against. Declared, it is graded exactly as
    // declared, which is not a way to choose which vectors count, only a way to be checked (§13.2).
    const kills = Array.isArray(mutant.kills) ? mutant.kills.map(String) : null;
    const predicted = kills ? new Set(kills) : null;
    for (const entry of kills ?? []) {
      const [invariant, id] = entry.split("#");
      const known = vectorDocs.get(invariant)?.vectors?.some((v) => v.id === id);
      if (!known) note("PREDICTION-STALE", mutant.name, entry);
    }

    const failed = new Set();
    for (const [invariant, doc] of vectorDocs) {
      if (!operations.has(doc.operation)) continue;
      for (const vector of doc.vectors) {
        const result = await judgeVector(file, { ...vector, operation: doc.operation });
        if (!result.pass) failed.add(`${invariant}#${vector.id}`);
      }
    }

    const outside = [...failed].filter((id) =>
      predicted ? !predicted.has(id) : !targets.includes(id.split("#")[0]),
    );
    for (const id of outside) note("MUTANT-COLLATERAL", mutant.name, id);

    if (failed.size === 0) {
      note("MUTANT-SURVIVED", mutant.name, `nothing in ${mutant.vector} rejects it`);
      mutants.survived += 1;
      survivedNames.add(mutant.name);
    } else {
      mutants.killed += 1;
      const missed = predicted ? [...predicted].filter((id) => !failed.has(id)) : [];
      if (missed.length > 0) {
        // It died, but not everywhere it said it would. The missed vectors are the ones that should
        // have caught it and did not, which is the most useful sentence in the whole verdict.
        note("MUTANT-PARTIAL", mutant.name, `did not fail ${missed.join(", ")}`);
      }
    }
  }

  // Falsifiability is about an invariant that is claimed and checked but never attacked. An
  // invariant with no vectors is a different finding, reported above.
  for (const id of declared) {
    if (vectorDocs.has(id) && !aims.has(id)) note("UNFALSIFIABLE", id);
  }

  const open = await loadQuestions(declared);
  await checkAttack(mutantManifest?.mutants ?? [], survivedNames);

  return {
    verb: "suite",
    runner: RUNNER,
    spec: SPEC,
    ok: violations.length === 0,
    violations,
    invariants: { declared: declared.length, covered: covered.size },
    mutants,
    questions: { open },
    owner,
  };
}

// --- judge ------------------------------------------------------------------------------

async function judge(command) {
  await loadFixtures();
  const owner = await checkIdentity();
  const vectorDir = join(SUITE, "vectors");
  let total = 0;
  const failures = [];
  for (const file of await list(vectorDir, ".yaml")) {
    const doc = await loadVectorFile(join(vectorDir, file), { requireInvariant: true });
    if (!doc) continue;
    for (const vector of doc.vectors) {
      total += 1;
      const result = await judgeVector(command, { ...vector, operation: doc.operation });
      if (!result.pass) failures.push({ vector: `${doc.invariant}#${vector.id}`, why: result.why });
    }
  }
  return {
    verb: "judge",
    runner: RUNNER,
    spec: SPEC,
    ok: failures.length === 0,
    vectors: { total, passed: total - failures.length },
    failures,
    owner,
  };
}

// --- main -------------------------------------------------------------------------------

const [verb, ...rest] = argv;
if (verb === "suite") {
  const verdict = await suite();
  if (saveFlag > -1) await save(verdict);
  process.stdout.write(`${JSON.stringify(verdict, null, 2)}\n`);
  process.exit(verdict.ok ? 0 : 1);
} else if (verb === "judge" && rest[0]) {
  const verdict = await judge(resolve(rest[0]));
  if (saveFlag > -1) await save(verdict);
  process.stdout.write(`${JSON.stringify(verdict, null, 2)}\n`);
  process.exit(verdict.ok ? 0 : 1);
} else {
  // Say the name the tool was actually called by. Under `npx` that is `conformance-runner`; run by
  // path it is the file, and naming the file is not a lie either.
  const bin = basename(process.argv[1] ?? "conformance-runner");
  process.stderr.write(
    `usage: ${bin} suite [--suite <dir>] [--save [dir]]\n` +
      `       ${bin} judge <command> [--suite <dir>] [--save [dir]]\n`,
  );
  process.exit(2);
}
