import { base58btcDecode, base58btcEncode } from "./base58.js";

export type DidKey = `did:key:z${string}`;

export class DidKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DidKeyError";
  }
}

export function didKeyFromPublicKey(publicKeyHex: string): DidKey {
  const display = JSON.stringify(
    publicKeyHex.length > 32 ? `${publicKeyHex.slice(0, 32)}…` : publicKeyHex,
  );
  if (publicKeyHex.length % 2 !== 0) {
    throw new DidKeyError(`expected an even-length hex string, got ${display}`);
  }
  if (!/^[0-9a-f]*$/i.test(publicKeyHex)) {
    throw new DidKeyError(`expected hex characters, got ${display}`);
  }
  const length = publicKeyHex.length / 2;
  if (length !== 32) {
    throw new DidKeyError(`expected a 32-byte Ed25519 public key, got ${length} bytes`);
  }

  const payload = new Uint8Array(34);
  payload.set([0xed, 0x01]);
  for (let i = 0; i < length; i++) {
    payload[i + 2] = Number.parseInt(publicKeyHex.slice(i * 2, i * 2 + 2), 16);
  }
  return `did:key:z${base58btcEncode(payload)}`;
}

export function publicKeyFromDidKey(did: string): string {
  if (!did.startsWith("did:key:")) {
    throw new DidKeyError(`not a did:key: ${JSON.stringify(did)}`);
  }

  const baseDid = did.split(/[/?#]/, 1)[0];
  if (!baseDid.startsWith("did:key:z")) {
    throw new DidKeyError(
      `unsupported multibase prefix in ${JSON.stringify(did)} (expected "z")`,
    );
  }

  let payload: Uint8Array;
  try {
    payload = base58btcDecode(baseDid.slice("did:key:z".length));
  } catch (error) {
    const prefix = "base58btc: invalid character ";
    if (!(error instanceof Error) || !error.message.startsWith(prefix)) {
      throw error;
    }
    throw new DidKeyError(
      `invalid base58btc payload in ${JSON.stringify(did)} (${error.message.slice("base58btc: ".length)})`,
    );
  }

  if (payload.length !== 34) {
    throw new DidKeyError(`expected 34 multicodec bytes, got ${payload.length}`);
  }
  if (payload[0] !== 0xed || payload[1] !== 0x01) {
    throw new DidKeyError("not an Ed25519 did:key (unexpected multicodec prefix)");
  }
  return Array.from(payload.subarray(2), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export function isDidKey(value: unknown): value is DidKey {
  if (typeof value !== "string") return false;
  try {
    publicKeyFromDidKey(value);
    return true;
  } catch (error) {
    if (error instanceof DidKeyError) return false;
    throw error;
  }
}
