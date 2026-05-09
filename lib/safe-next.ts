// Validates that a `next` redirect target is a same-origin path.
//
// Why this is non-trivial: when concatenated to an origin, attacker-controlled
// next values like "@evil.com" turn `${origin}${next}` into a URL whose
// userinfo is the trusted host and whose actual host is the attacker's.
// "//evil.com" and "/\\evil.com" exploit similar parsing quirks. Path-only
// strings starting with a single "/" are safe.
export function isSafeNextPath(p: string | null | undefined): p is string {
  if (!p) return false;
  if (!p.startsWith("/")) return false;
  if (p.startsWith("//")) return false;
  if (p.startsWith("/\\")) return false;
  return true;
}

export function safeNextOr(p: string | null | undefined, fallback: string): string {
  return isSafeNextPath(p) ? p : fallback;
}
