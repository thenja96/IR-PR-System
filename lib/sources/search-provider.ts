// Pluggable web-search provider for Source Discovery. Server-side only.
//
// Configure via environment variables:
//   SEARCH_PROVIDER = "serper" | "tavily" | "brave"   (default: "serper")
//   SEARCH_API_KEY  = the provider's API key
//
// Each provider is a thin adapter returning the same WebSearchResult shape,
// so swapping providers is an env change, not a code change.

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  /** ISO-ish date string when the provider reports one */
  publishedDate: string | null;
}

export interface SearchOptions {
  /** Restrict to results from the last N days (provider best-effort) */
  freshnessDays?: number;
  /** Max results per query */
  count?: number;
}

export interface SearchProvider {
  name: string;
  search(query: string, options?: SearchOptions): Promise<WebSearchResult[]>;
}

const FETCH_TIMEOUT_MS = 12_000;

async function timedFetch(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ── Serper (google.serper.dev) ────────────────────────────────
function serperProvider(apiKey: string): SearchProvider {
  return {
    name: "serper",
    async search(query, options) {
      const body: Record<string, unknown> = {
        q: query,
        num: options?.count ?? 10,
        gl: "my", // Malaysia
      };
      if (options?.freshnessDays) {
        body.tbs =
          options.freshnessDays <= 31
            ? "qdr:m"
            : options.freshnessDays <= 93
              ? "qdr:m3"
              : "qdr:y";
      }
      const res = await timedFetch("https://google.serper.dev/search", {
        method: "POST",
        headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw new Error(`Serper search failed (HTTP ${res.status}).`);
      }
      const data = (await res.json()) as {
        organic?: { title?: string; link?: string; snippet?: string; date?: string }[];
      };
      return (data.organic ?? [])
        .filter((r) => r.link)
        .map((r) => ({
          title: r.title ?? r.link!,
          url: r.link!,
          snippet: r.snippet ?? "",
          publishedDate: r.date ?? null,
        }));
    },
  };
}

// ── Tavily (api.tavily.com) ───────────────────────────────────
function tavilyProvider(apiKey: string): SearchProvider {
  return {
    name: "tavily",
    async search(query, options) {
      const res = await timedFetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: apiKey,
          query,
          max_results: options?.count ?? 10,
          days: options?.freshnessDays,
          search_depth: "basic",
        }),
      });
      if (!res.ok) {
        throw new Error(`Tavily search failed (HTTP ${res.status}).`);
      }
      const data = (await res.json()) as {
        results?: { title?: string; url?: string; content?: string; published_date?: string }[];
      };
      return (data.results ?? [])
        .filter((r) => r.url)
        .map((r) => ({
          title: r.title ?? r.url!,
          url: r.url!,
          snippet: (r.content ?? "").slice(0, 300),
          publishedDate: r.published_date ?? null,
        }));
    },
  };
}

// ── Brave (api.search.brave.com) ──────────────────────────────
function braveProvider(apiKey: string): SearchProvider {
  return {
    name: "brave",
    async search(query, options) {
      const params = new URLSearchParams({
        q: query,
        count: String(options?.count ?? 10),
        country: "MY",
      });
      if (options?.freshnessDays) {
        params.set(
          "freshness",
          options.freshnessDays <= 31 ? "pm" : options.freshnessDays <= 93 ? "p3m" : "py"
        );
      }
      const res = await timedFetch(
        `https://api.search.brave.com/res/v1/web/search?${params.toString()}`,
        {
          method: "GET",
          headers: { "X-Subscription-Token": apiKey, Accept: "application/json" },
        }
      );
      if (!res.ok) {
        throw new Error(`Brave search failed (HTTP ${res.status}).`);
      }
      const data = (await res.json()) as {
        web?: { results?: { title?: string; url?: string; description?: string; age?: string }[] };
      };
      return (data.web?.results ?? [])
        .filter((r) => r.url)
        .map((r) => ({
          title: r.title ?? r.url!,
          url: r.url!,
          snippet: r.description ?? "",
          publishedDate: r.age ?? null,
        }));
    },
  };
}

export function isSearchConfigured(): boolean {
  return Boolean(process.env.SEARCH_API_KEY);
}

/**
 * Resolve the configured provider. Returns null when SEARCH_API_KEY is not
 * set — callers must surface a setup message and fall back to manual import.
 */
export function getSearchProvider(): SearchProvider | null {
  const apiKey = process.env.SEARCH_API_KEY;
  if (!apiKey) return null;
  const provider = (process.env.SEARCH_PROVIDER ?? "serper").toLowerCase();
  switch (provider) {
    case "serper":
      return serperProvider(apiKey);
    case "tavily":
      return tavilyProvider(apiKey);
    case "brave":
      return braveProvider(apiKey);
    default:
      throw new Error(
        `Unknown SEARCH_PROVIDER "${provider}". Supported: serper, tavily, brave.`
      );
  }
}
