// Server-side readable-text extraction from fetched HTML.
// Dependency-free by design for Phase 1: regex-based stripping is good enough
// for announcement pages, IR pages, and media articles. PDF extraction is NOT
// supported here — PDF URLs are saved as link-only sources.

export interface ExtractedPage {
  title: string;
  text: string;
  author: string | null;
  publication: string | null;
  language: string | null;
}

const BLOCK_TAGS =
  /<\/(?:p|div|section|article|li|tr|h[1-6]|blockquote|br|table|ul|ol)>|<br\s*\/?>/gi;

function decodeEntities(input: string): string {
  return input
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code: string) => {
      const n = Number(code);
      return Number.isFinite(n) && n > 0 && n < 0x10ffff ? String.fromCodePoint(n) : " ";
    })
    .replace(/&mdash;/gi, "—")
    .replace(/&ndash;/gi, "–")
    .replace(/&rsquo;/gi, "'")
    .replace(/&lsquo;/gi, "'")
    .replace(/&rdquo;/gi, "”")
    .replace(/&ldquo;/gi, "“");
}

function metaContent(html: string, attr: string, value: string): string | null {
  // Matches <meta property="og:title" content="..."> in either attribute order.
  const patterns = [
    new RegExp(`<meta[^>]+${attr}=["']${value}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+${attr}=["']${value}["']`, "i"),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return decodeEntities(m[1].trim());
  }
  return null;
}

export function extractFromHtml(html: string): ExtractedPage {
  const titleTag = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const title =
    metaContent(html, "property", "og:title") ??
    (titleTag ? decodeEntities(titleTag.trim()).replace(/\s+/g, " ") : "");

  const author =
    metaContent(html, "name", "author") ?? metaContent(html, "property", "article:author");
  const publication = metaContent(html, "property", "og:site_name");
  const language = html.match(/<html[^>]+lang=["']([a-zA-Z-]+)["']/i)?.[1] ?? null;

  let body = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<head[\s\S]*?<\/head>/i, " ")
    .replace(/<(?:nav|header|footer|aside|form)[\s\S]*?<\/(?:nav|header|footer|aside|form)>/gi, " ");

  body = body.replace(BLOCK_TAGS, "\n");
  body = body.replace(/<[^>]+>/g, " ");
  body = decodeEntities(body);

  const text = body
    .split("\n")
    .map((line) => line.replace(/[ \t ]+/g, " ").trim())
    .filter((line) => line.length > 0)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");

  return {
    title: title || "Untitled page",
    text,
    author,
    publication,
    language,
  };
}
