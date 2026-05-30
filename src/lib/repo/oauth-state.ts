import type { RepoProvider } from "./types";
import { getOAuthStateSecret } from "./oauth-config";

const STATE_TTL_MS = 10 * 60 * 1000;

export interface RepoOAuthStatePayload {
  userId: string;
  connectionId: string | null;
  provider: RepoProvider;
  repoUrl: string;
  repoFullName: string;
  gitlabBaseUrl: string | null;
  returnPath: string;
  exp: number;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/u, "");
}

function base64UrlDecode(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (padded.length % 4)) % 4;
  const binary = atob(padded + "=".repeat(padLength));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function sign(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return base64UrlEncode(new Uint8Array(signature));
}

async function verifySignature(value: string, signature: string, secret: string): Promise<boolean> {
  const expected = await sign(value, secret);
  if (expected.length !== signature.length) {
    return false;
  }

  let mismatch = 0;
  for (let index = 0; index < expected.length; index += 1) {
    mismatch |= expected.charCodeAt(index) ^ signature.charCodeAt(index);
  }
  return mismatch === 0;
}

export async function createOAuthState(payload: Omit<RepoOAuthStatePayload, "exp">): Promise<string | null> {
  const secret = getOAuthStateSecret();
  if (!secret) {
    return null;
  }

  const body: RepoOAuthStatePayload = {
    ...payload,
    exp: Date.now() + STATE_TTL_MS,
  };
  const encoded = base64UrlEncode(new TextEncoder().encode(JSON.stringify(body)));
  const signature = await sign(encoded, secret);
  return `${encoded}.${signature}`;
}

export async function parseOAuthState(state: string): Promise<RepoOAuthStatePayload | null> {
  const secret = getOAuthStateSecret();
  if (!secret) {
    return null;
  }

  const separator = state.lastIndexOf(".");
  if (separator <= 0) {
    return null;
  }

  const encoded = state.slice(0, separator);
  const signature = state.slice(separator + 1);
  const valid = await verifySignature(encoded, signature, secret);
  if (!valid) {
    return null;
  }

  try {
    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(encoded))) as RepoOAuthStatePayload;
    if (
      typeof payload.userId !== "string" ||
      typeof payload.provider !== "string" ||
      typeof payload.repoUrl !== "string" ||
      typeof payload.repoFullName !== "string" ||
      typeof payload.returnPath !== "string" ||
      typeof payload.exp !== "number"
    ) {
      return null;
    }

    if (payload.exp < Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
