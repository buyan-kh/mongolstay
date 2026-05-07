import "server-only";

// In-memory token bucket for rate limiting. Per-instance, so on Vercel
// each serverless invocation has its own counters — fine as a soft
// floor against bursty bots; promote to Upstash Redis or Vercel KV when
// you need cross-region accuracy.

type Bucket = { tokens: number; last: number };
const buckets = new Map<string, Bucket>();

function getKey(prefix: string, ip: string | null) {
  return `${prefix}:${ip ?? "unknown"}`;
}

// Returns true if the request is allowed; false if rate-limited.
export function rateLimit(
  prefix: string,
  ip: string | null,
  opts: { capacity: number; refillPerMinute: number },
): boolean {
  const key = getKey(prefix, ip);
  const now = Date.now();
  const refillRate = opts.refillPerMinute / 60_000; // tokens per ms
  const existing = buckets.get(key);

  if (!existing) {
    buckets.set(key, { tokens: opts.capacity - 1, last: now });
    return true;
  }

  const elapsed = now - existing.last;
  const refilled = Math.min(opts.capacity, existing.tokens + elapsed * refillRate);
  if (refilled < 1) {
    existing.tokens = refilled;
    existing.last = now;
    return false;
  }
  existing.tokens = refilled - 1;
  existing.last = now;
  return true;
}

// Purges old buckets so the map doesn't grow unbounded. Called from
// every rate check; cheap.
function gc() {
  if (buckets.size < 1000) return;
  const cutoff = Date.now() - 30 * 60_000;
  for (const [k, v] of buckets.entries()) {
    if (v.last < cutoff) buckets.delete(k);
  }
}

export function requestIp(headers: Headers): string | null {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return headers.get("x-real-ip");
}

export function originAllowed(req: Request) {
  // Reject cross-origin POSTs. Same-origin requests have origin === host
  // (or sometimes no origin for direct fetches from server). For stricter
  // CSRF protection in addition to SameSite cookies.
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (!origin) return true; // server-to-server / direct fetch — allowed
  if (!host) return false;
  try {
    const url = new URL(origin);
    return url.host === host;
  } catch {
    return false;
  }
}

// Side effect: trigger GC once per import.
gc();
