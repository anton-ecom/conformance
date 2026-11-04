/**
 * did:key — an Ed25519 public key, encoded.
 *
 * `did:key:z` followed by the base58btc of `0xed01` concatenated with the 32-byte
 * key. No registry, no network, no curve check beyond the multicodec prefix and
 * the length. Resolution is the inverse, local and total.
 */

import { base58btcDecode, base58btcEncode } from "./base58.js";

const ED25519_PREFIX = new Uint8Array([0xed, 0x01]);
const PUBLIC_KEY_LENGTH = 32;
const MULTICODEC_LENGTH = ED25519_PREFIX.length + PUBLIC_KEY_LENGTH;
const METHOD_PREFIX = "did:key:";
const MULTIBASE_PREFIX = "z";
/** Inputs longer than this are named by their head only, so a refusal cannot echo an unbounded string. */
const REFUSAL_PREVIEW = 32;

export class DidKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DidKeyError";
  }
}

/** A `did:key` string. The brand is a type-level mark; the wire value is the string. */
export type DidKey = string & { readonly __didKey: "did:key" };

function preview(input: string): string {
  return input.length > REFUSAL_PREVIEW ? `${input.slice(0, REFUSAL_PREVIEW)}…` : input;
}

function quoted(input: string): string {
  return JSON.stringify(input);
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  let hex = "";
  for (const byte of bytes) hex += byte.toString(16).padStart(2, "0");
  return hex;
}

function codecDetail(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/^base58btc: /, "");
}

/**
 * Derive `did:key:z` + base58btc(`0xed01` ‖ key). Hex is case-insensitive; the
 * DID is canonical and carries nothing but the key.
 *
 * @throws {DidKeyError} when the input is not exactly 32 bytes of even-length hex.
 */
export function didKeyFromPublicKey(publicKeyHex: string): DidKey {
  if (publicKeyHex.length % 2 !== 0) {
    throw new DidKeyError(
      `expected an even-length hex string, got ${quoted(preview(publicKeyHex))}`,
    );
  }
  if (!/^[0-9a-fA-F]*$/.test(publicKeyHex)) {
    throw new DidKeyError(`expected hex characters, got ${quoted(preview(publicKeyHex))}`);
  }

  const key = hexToBytes(publicKeyHex);
  if (key.length !== PUBLIC_KEY_LENGTH) {
    throw new DidKeyError(
      `expected a 32-byte Ed25519 public key, got ${key.length} bytes`,
    );
  }

  const payload = new Uint8Array(MULTICODEC_LENGTH);
  payload.set(ED25519_PREFIX, 0);
  payload.set(key, ED25519_PREFIX.length);
  return `did:key:${MULTIBASE_PREFIX}${base58btcEncode(payload)}` as DidKey;
}

/**
 * Resolve a `did:key` or a DID URL over one to the 32-byte key, lowercase hex.
 * Only `/`, `?` and `#` delimit a URL; everything else stays in the payload.
 *
 * @throws {DidKeyError} for every refusal, including a fault detected by the codec.
 */
export function publicKeyFromDidKey(did: string): string {
  if (!did.startsWith(METHOD_PREFIX)) {
    throw new DidKeyError(`not a did:key: ${quoted(did)}`);
  }
  if (did[METHOD_PREFIX.length] !== MULTIBASE_PREFIX) {
    throw new DidKeyError(
      `unsupported multibase prefix in ${quoted(did)} (expected ${quoted(MULTIBASE_PREFIX)})`,
    );
  }

  const delimiter = did.search(/[/?#]/);
  const base = delimiter === -1 ? did : did.slice(0, delimiter);
  const payload = base.slice(METHOD_PREFIX.length + MULTIBASE_PREFIX.length);

  let decoded: Uint8Array;
  try {
    decoded = base58btcDecode(payload);
  } catch (error) {
    throw new DidKeyError(`invalid base58btc payload in ${quoted(did)} (${codecDetail(error)})`);
  }

  if (decoded.length !== MULTICODEC_LENGTH) {
    throw new DidKeyError(`expected 34 multicodec bytes, got ${decoded.length}`);
  }
  if (decoded[0] !== ED25519_PREFIX[0] || decoded[1] !== ED25519_PREFIX[1]) {
    throw new DidKeyError("not an Ed25519 did:key (unexpected multicodec prefix)");
  }

  return bytesToHex(decoded.subarray(ED25519_PREFIX.length));
}

/**
 * Total guard: true only when the value is a string that resolves. Every throw
 * is swallowed, defects included — a guard that can throw is a trap.
 */
export function isDidKey(value: unknown): value is DidKey {
  if (typeof value !== "string") return false;
  try {
    publicKeyFromDidKey(value);
    return true;
  } catch {
    return false;
  }
}
