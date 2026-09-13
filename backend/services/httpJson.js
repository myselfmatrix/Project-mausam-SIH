/*
  One HTTP helper for every upstream call.

  Everything this app shows live — forecast, air quality, marine, geocoding —
  comes from a public API that can be slow, rate-limited, or briefly down. A
  bare fetch() has three failure modes that all reach the user as a broken
  dashboard: a request that hangs forever (no timeout), one transient 503 that
  empties a panel (no retry), and a burst of identical requests that trips a
  rate limit (no coalescing — see services/cache.js for that half).

  So every outbound call goes through here instead.
*/

class HttpError extends Error {
  constructor(message, status, url) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.url = url;
  }
}

// Upstreams are asked to identify us. Open-Meteo doesn't require it; the
// OpenStreetMap Nominatim usage policy does, and it wants a contact address
// so they can reach a human before they block a misbehaving client.
const USER_AGENT =
  process.env.UPSTREAM_USER_AGENT ||
  'MausamSIH/1.0 (Ministry of Earth Sciences SIH26076 prototype; +https://github.com/mausam-sih)';

const DEFAULT_TIMEOUT = Number(process.env.UPSTREAM_TIMEOUT_MS || 9000);
const DEFAULT_RETRIES = Number(process.env.UPSTREAM_RETRIES || 2);

/**
 * A status worth trying again.
 *
 * 4xx means we asked the wrong question and asking again won't change the
 * answer — retrying it just burns the rate limit we're trying to protect. The
 * exceptions are 429 (asked too often, not wrongly) and 408 (upstream's own
 * timeout).
 */
const isRetryableStatus = (status) => status === 429 || status === 408 || status >= 500;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Backoff with jitter.
 *
 * Several panels refresh at once, so a flat delay would line their retries up
 * into exactly the synchronised burst that caused the 429. The random spread
 * pulls them apart.
 */
const backoffFor = (attempt) => Math.round(400 * 2 ** attempt + Math.random() * 250);

/**
 * GETs `url` and parses JSON.
 *
 * Throws HttpError on a non-2xx or unparseable body, after exhausting retries.
 * Callers are expected to catch: every consumer of this in the app treats an
 * upstream failure as "that section is unavailable", never as a 500.
 */
async function fetchJson(url, options = {}) {
  const {
    timeout = DEFAULT_TIMEOUT,
    retries = DEFAULT_RETRIES,
    headers = {},
    signal: callerSignal,
  } = options;

  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    // A fresh controller per attempt — an aborted one stays aborted.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    const onCallerAbort = () => controller.abort();
    if (callerSignal) {
      if (callerSignal.aborted) controller.abort();
      else callerSignal.addEventListener('abort', onCallerAbort, { once: true });
    }

    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json', 'User-Agent': USER_AGENT, ...headers },
        signal: controller.signal,
        redirect: 'follow',
      });

      if (!response.ok) {
        const detail = (await response.text().catch(() => '')).slice(0, 300);
        const error = new HttpError(
          `Upstream ${response.status}${detail ? `: ${detail}` : ''}`,
          response.status,
          url,
        );
        if (attempt < retries && isRetryableStatus(response.status)) {
          lastError = error;
          await sleep(backoffFor(attempt));
          continue;
        }
        throw error;
      }

      return await response.json();
    } catch (error) {
      // The caller giving up is not a failure to retry around.
      if (callerSignal?.aborted) throw error;

      const isTimeout = error.name === 'AbortError';
      const isNetwork = error instanceof TypeError || error.name === 'FetchError';
      const retryable = isTimeout || isNetwork || (error instanceof HttpError && isRetryableStatus(error.status));

      if (attempt < retries && retryable) {
        lastError = isTimeout ? new HttpError(`Upstream timed out after ${timeout}ms`, 504, url) : error;
        await sleep(backoffFor(attempt));
        continue;
      }

      if (isTimeout) throw new HttpError(`Upstream timed out after ${timeout}ms`, 504, url);
      if (error instanceof HttpError) throw error;
      throw new HttpError(error.message || 'Upstream request failed', 502, url);
    } finally {
      clearTimeout(timer);
      callerSignal?.removeEventListener?.('abort', onCallerAbort);
    }
  }

  throw lastError || new HttpError('Upstream request failed', 502, url);
}

/** Builds a query string, dropping null/undefined so optional params vanish. */
function buildUrl(base, params = {}) {
  const url = new URL(base);
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === '') continue;
    url.searchParams.set(key, Array.isArray(value) ? value.join(',') : String(value));
  }
  return url.toString();
}

module.exports = { fetchJson, buildUrl, HttpError, USER_AGENT };
