import { base58btcDecode, base58btcEncode } from "./base58.js";

export type DidKey = `did:key:z${string}`;

export class DidKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DidKeyError";
  }
}

export function didKeyFromPublicKey(publicKeyHex: string): DidKey {
  const displayed = JSON.stringify(
    publicKeyHex.length > 32 ? `${publicKeyHex.slice(0, 32)}…` : publicKeyHex,
  );
  if (publicKeyHex.length % 2 !== 0) {
    throw new DidKeyError(`expected an even-length hex string, got ${displayed}`);
  }
  if (!/^[0-9a-f]*$/i.test(publicKeyHex)) {
    throw new DidKeyError(`expected hex characters, got ${displayed}`);
  }
  if (publicKeyHex.length !== 64) {
    throw new DidKeyError(
      `expected a 32-byte Ed25519 public key, got ${publicKeyHex.length / 2} bytes`,
    );
  }

  const bytes = new Uint8Array(34);
  bytes[0] = 0xed;
  bytes[1] = 0x01;
  for (let i = 0; i < 32; i++) {
    bytes[i + 2] = Number.parseInt(publicKeyHex.slice(i * 2, i * 2 + 2), 16);
  }
  return `did:key:z${base58btcEncode(bytes)}`;
}

export function publicKeyFromDidKey(did: string): string {
  if (!did.startsWith("did:key:")) {
    throw new DidKeyError(`not a did:key: ${JSON.stringify(did)}`);
  }

  const baseDid = did.split(/[/?#]/, 1)[0];
  if (!baseDid.startsWith("did:key:z")) {
    throw new DidKeyError(
      `unsupported multibase prefix in ${JSON.stringify(baseDid)} (expected "z")`,
    );
  }

  let bytes: Uint8Array;
  try {
    bytes = base58btcDecode(baseDid.slice("did:key:z".length));
  } catch (error) {
    if (!(error instanceof Error) || !error.message.startsWith("base58btc: ")) {
      throw error;
    }
    throw new DidKeyError(
      `invalid base58btc payload in ${JSON.stringify(baseDid)} (${error.message.slice("base58btc: ".length)})`,
    );
  }
  if (bytes.length !== 34) {
    throw new DidKeyError(`expected 34 multicodec bytes, got ${bytes.length}`);
  }
  if (bytes[0] !== 0xed || bytes[1] !== 0x01) {
    throw new DidKeyError("not an Ed25519 did:key (unexpected multicodec prefix)");
  }

  return Array.from(bytes.subarray(2), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function isDidKey(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    publicKeyFromDidKey(value);
    return true;
  } catch {
    return false;
  }
}
