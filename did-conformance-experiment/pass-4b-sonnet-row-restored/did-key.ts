/**
 * did:key for Ed25519 — both directions.
 *
 * A did:key is `did:key:z` followed by the base58btc of the multicodec prefix `0xed01`
 * concatenated with the 32-byte public key. Pure encoding: no registry, no network, no crypto.
 */

import { base58btcDecode, base58btcEncode } from "./base58.js";

const DID_KEY_PREFIX = "did:key:";
const MULTIBASE_BASE58BTC = "z";
const ED25519_MULTICODEC = [0xed, 0x01] as const;
const KEY_LENGTH = 32;
const PAYLOAD_LENGTH = ED25519_MULTICODEC.length + KEY_LENGTH;
const ECHO_LIMIT = 32;
const CODEC_ERROR_PREFIX = "base58btc: ";

/** Every refusal from the DID layer. The codec's own refusals stay plain `Error`s. */
export class DidKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DidKeyError";
  }
}

/** Quote an input for a message, bounded so a hostile string is never echoed whole. */
function quoteBounded(value: string): string {
  const shown = value.length > ECHO_LIMIT ? `${value.slice(0, ECHO_LIMIT)}…` : value;
  return JSON.stringify(shown);
}

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new DidKeyError(`expected an even-length hex string, got ${quoteBounded(hex)}`);
  }
  if (!/^[0-9a-fA-F]*$/.test(hex)) {
    throw new DidKeyError(`expected hex characters, got ${quoteBounded(hex)}`);
  }
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

/**
 * Derive the did:key for an Ed25519 public key given as hex (case-insensitive).
 *
 * @throws {DidKeyError} if the input is not exactly 32 bytes of even-length hex.
 */
export function didKeyFromPublicKey(publicKeyHex: string): string {
  const key = hexToBytes(publicKeyHex);
  if (key.length !== KEY_LENGTH) {
    throw new DidKeyError(
      `expected a ${KEY_LENGTH}-byte Ed25519 public key, got ${key.length} bytes`,
    );
  }
  const payload = new Uint8Array(PAYLOAD_LENGTH);
  payload.set(ED25519_MULTICODEC, 0);
  payload.set(key, ED25519_MULTICODEC.length);
  return `${DID_KEY_PREFIX}${MULTIBASE_BASE58BTC}${base58btcEncode(payload)}`;
}

/**
 * Resolve a did:key (or a DID URL over one) to its Ed25519 public key, as lowercase hex.
 * Whatever follows the first `/`, `?` or `#` is ignored.
 *
 * @throws {DidKeyError} if the input is not a well-formed Ed25519 did:key.
 */
export function publicKeyFromDidKey(did: string): string {
  const delimiter = did.search(/[/?#]/);
  const base = delimiter === -1 ? did : did.slice(0, delimiter);

  if (!base.startsWith(DID_KEY_PREFIX)) {
    throw new DidKeyError(`not a did:key: ${JSON.stringify(did)}`);
  }

  const rest = base.slice(DID_KEY_PREFIX.length);
  if (!rest.startsWith(MULTIBASE_BASE58BTC)) {
    throw new DidKeyError(
      `unsupported multibase prefix in ${JSON.stringify(did)} (expected "${MULTIBASE_BASE58BTC}")`,
    );
  }

  let payload: Uint8Array;
  try {
    payload = base58btcDecode(rest.slice(MULTIBASE_BASE58BTC.length));
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    const reason = detail.startsWith(CODEC_ERROR_PREFIX)
      ? detail.slice(CODEC_ERROR_PREFIX.length)
      : detail;
    throw new DidKeyError(`invalid base58btc payload in ${JSON.stringify(did)} (${reason})`);
  }

  if (payload.length !== PAYLOAD_LENGTH) {
    throw new DidKeyError(
      `expected ${PAYLOAD_LENGTH} multicodec bytes, got ${payload.length}`,
    );
  }
  if (payload[0] !== ED25519_MULTICODEC[0] || payload[1] !== ED25519_MULTICODEC[1]) {
    throw new DidKeyError("not an Ed25519 did:key (unexpected multicodec prefix)");
  }

  return bytesToHex(payload.subarray(ED25519_MULTICODEC.length));
}

/**
 * True when `value` is a string that resolves as an Ed25519 did:key (bare or a DID URL).
 * Total: never throws, whatever the input.
 */
export function isDidKey(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    publicKeyFromDidKey(value);
    return true;
  } catch {
    return false;
  }
}
