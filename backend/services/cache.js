/*
  TTL cache with request coalescing and a stale grace period.

  Three separate jobs, all of which exist to keep live data honest:

  1. TTL — weather models publish on a schedule. Re-fetching the same
     coordinate every few seconds gets a byte-identical answer and spends
     someone else's rate limit to do it.

  2. Coalescing — the dashboard opens six panels at once and the locations
     grid asks for every saved city. Without an in-flight map that is a dozen
     simultaneous requests for the same URL; with one it is a single request
     that a dozen callers await.

  3. Stale grace — the important one. When an upstream is briefly unreachable,
     the choice is between an error panel and real readings from a few minutes
     ago. Readings from a few minutes ago are strictly better, so an entry
     stays usable well past its TTL and is only handed out if the refresh
     actually fails. The caller is told (`fresh: false`) so the UI can say so
     rather than passing stale data off as current.
*/

const DEFAULT_TTL = 10 * 60 * 1000;
const DEFAULT_MAX = 600;
// How far past the TTL an entry may still be used as a fallback.
const DEFAULT_GRACE_FACTOR = 12;

function createCache(options = {}) {
  const {
    ttl = DEFAULT_TTL,
    max = DEFAULT_MAX,
    graceFactor = DEFAULT_GRACE_FACTOR,
    name = 'cache',
  } = options;

  /** key -> { value, fetchedAt } */
  const entries = new Map();
  /** key -> Promise, so concurrent callers share one upstream request */
  const inflight = new Map();

  const stats = { hits: 0, misses: 0, staleServed: 0, coalesced: 0 };

  /*
    Insertion-ordered eviction: Map preserves insertion order, and set()
    deletes before re-inserting, so the first key is always the least recently
    written. Good enough here — entries expire on time anyway, and this cap
    only exists to stop an unbounded key space (arbitrary coordinates) from
    growing the heap forever.
  */
  const evictIfNeeded = () => {
    while (entries.size > max) {
      const oldest = entries.keys().next().value;
      if (oldest === undefined) break;
      entries.delete(oldest);
    }
  };

  const read = (key) => {
    const entry = entries.get(key);
    if (!entry) return null;
    const age = Date.now() - entry.fetchedAt;
    if (age > ttl * graceFactor) {
      entries.delete(key);
      return null;
    }
    return { ...entry, age, fresh: age <= ttl };
  };

  const write = (key, value) => {
    entries.delete(key);
    entries.set(key, { value, fetchedAt: Date.now() });
    evictIfNeeded();
  };

  /**
   * Returns `{ value, fresh, fetchedAt, ageMs }`, calling `producer` only when
   * there is nothing fresh cached and no identical request already running.
   *
   * If `producer` throws and a stale entry exists, that entry is returned with
   * `fresh: false` instead of the error propagating.
   */
  async function wrap(key, producer) {
    const cached = read(key);
    if (cached?.fresh) {
      stats.hits += 1;
      return { value: cached.value, fresh: true, fetchedAt: cached.fetchedAt, ageMs: cached.age };
    }

    const running = inflight.get(key);
    if (running) {
      stats.coalesced += 1;
      return running;
    }

    stats.misses += 1;
    const task = (async () => {
      try {
        const value = await producer();
        write(key, value);
        return { value, fresh: true, fetchedAt: Date.now(), ageMs: 0 };
      } catch (error) {
        const fallback = read(key);
        if (fallback) {
          stats.staleServed += 1;
          return {
            value: fallback.value,
            fresh: false,
            fetchedAt: fallback.fetchedAt,
            ageMs: fallback.age,
            error,
          };
        }
        throw error;
      } finally {
        inflight.delete(key);
      }
    })();

    inflight.set(key, task);
    return task;
  }

  return {
    name,
    wrap,
    get: (key) => read(key)?.value ?? null,
    set: write,
    delete: (key) => entries.delete(key),
    clear: () => {
      entries.clear();
      inflight.clear();
    },
    stats: () => ({ ...stats, size: entries.size, inflight: inflight.size }),
  };
}

module.exports = { createCache };
