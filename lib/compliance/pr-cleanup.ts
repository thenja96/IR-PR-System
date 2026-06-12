// Deterministic post-cleanup for "Fix Draft" press release rewrites.
// The AI rewrite goes first; this pass then mechanically removes every
// hard-banned phrase and marks unmapped financial claims, so the displayed
// revised output cannot contain hard-banned wording even when the model
// misses some. Runs BEFORE the final PR compliance re-check.
//
// Lines containing URLs are left untouched so source links and titles in
// "Sources Used" are never corrupted.

export interface CleanupReplacement {
  phrase: string;
  count: number;
}

export interface CleanupResult {
  text: string;
  replacements: CleanupReplacement[];
}

interface CleanupRule {
  phrase: string;
  pattern: RegExp;
  replacement: string;
}

// Order matters: longer, more specific phrases first so e.g.
// "leading Malaysian conglomerate" is rewritten before any "leading" handling.
const CLEANUP_RULES: CleanupRule[] = [
  // Specified replacements
  {
    phrase: "leading Malaysian conglomerate",
    pattern: /\bleading\s+Malaysian\s+conglomerate\b/gi,
    replacement: "Malaysian Bursa-listed group",
  },
  {
    phrase: "strong regional presence",
    pattern: /\bstrong\s+regional\s+presence\b/gi,
    replacement: "regional presence (requires verification)",
  },
  {
    phrase: "evolving market needs / demands",
    pattern: /\bevolving\s+(?:market\s+)?(?:needs|demands)\b/gi,
    replacement: "customer requirements",
  },
  {
    phrase: "commitment to sustainability / innovation",
    pattern:
      /\bcommitment\s+to\s+(?:sustainability(?:\s+and\s+innovation)?|innovation(?:\s+and\s+sustainability)?)\b/gi,
    replacement:
      "sustainability and innovation initiatives (requires management confirmation unless tied to a disclosed initiative)",
  },
  {
    phrase: "is/are well-positioned (to …)",
    pattern:
      /\b(?:is|are|remains?|was|were|be)\s+well[\s-]positioned(?:\s+to\s+\w+(?:\s+(?:[a-z]+|its|the|their|and|of))*)?/gi,
    replacement:
      "will continue to focus on disclosed operating priorities, subject to management confirmation",
  },
  {
    phrase: "well-positioned",
    pattern: /\bwell[\s-]positioned\b/gi,
    replacement:
      "focused on disclosed operating priorities, subject to management confirmation",
  },
  {
    phrase: "positions it/us well",
    pattern: /\bposition(?:s|ed)?\s+(?:us|it|itself|the\s+(?:company|group))\s+well\b/gi,
    replacement:
      "supports the Group's disclosed operating priorities, subject to management confirmation",
  },
  { phrase: "positioned well", pattern: /\bpositioned\s+well\b/gi, replacement: "aligned with disclosed priorities" },
  { phrase: "growth trajectory", pattern: /\bgrowth\s+trajector(?:y|ies)\b/gi, replacement: "reported performance" },
  { phrase: "underscores", pattern: /\bunderscores\b/gi, replacement: "reflects" },
  { phrase: "underscored", pattern: /\bunderscored\b/gi, replacement: "reflected" },
  { phrase: "underscoring", pattern: /\bunderscoring\b/gi, replacement: "reflecting" },
  { phrase: "underscore", pattern: /\bunderscore\b/gi, replacement: "reflect" },
  // Remaining hard-banned phrases — neutral factual fallbacks
  { phrase: "a testament to", pattern: /\b(?:a\s+)?testament\s+to\b/gi, replacement: "a reflection of" },
  { phrase: "paving the way", pattern: /\bpaving\s+the\s+way\b/gi, replacement: "providing support" },
  { phrase: "further solidifies", pattern: /\bfurther\s+solidif(?:ies|y|ied|ying)\b/gi, replacement: "supports" },
  { phrase: "poised to", pattern: /\bpoised\s+to\b/gi, replacement: "expected, subject to management confirmation, to" },
  { phrase: "poised", pattern: /\bpoised\b/gi, replacement: "prepared" },
  { phrase: "unlocking", pattern: /\bunlocking\b/gi, replacement: "supporting" },
  { phrase: "unlocks", pattern: /\bunlocks\b/gi, replacement: "supports" },
  { phrase: "unlocked", pattern: /\bunlocked\b/gi, replacement: "supported" },
  { phrase: "unlock", pattern: /\bunlock\b/gi, replacement: "support" },
  // Dropping a hype adjective is grammatically safe: "a robust performance" → "a performance".
  { phrase: "robust", pattern: /\brobust\s+/gi, replacement: "" },
  { phrase: "robust (trailing)", pattern: /\s+robust\b/gi, replacement: "" },
  { phrase: "impressive", pattern: /\bimpressive\s+/gi, replacement: "" },
  { phrase: "impressive (trailing)", pattern: /\s+impressive\b/gi, replacement: "" },
  { phrase: "capitalize on", pattern: /\bcapitali[sz](?:e|es|ing)\s+on\b/gi, replacement: "respond to" },
  { phrase: "capitalized on", pattern: /\bcapitali[sz]ed\s+on\b/gi, replacement: "responded to" },
  {
    phrase: "future opportunities",
    pattern: /\bfuture\s+opportunit(?:y|ies)\b/gi,
    replacement: "potential opportunities (requires management confirmation)",
  },
  { phrase: "growth and expansion", pattern: /\bgrowth\s+and\s+expansion\b/gi, replacement: "disclosed growth initiatives" },
  {
    phrase: "navigating the complexities",
    pattern: /\bnavigat(?:e|es|ed|ing)\s+the\s+complexit(?:y|ies)(?:\s+of)?\b/gi,
    replacement: "operating in",
  },
  { phrase: "leading player", pattern: /\bleading\s+player\b/gi, replacement: "established player" },
  { phrase: "market positioning", pattern: /\bmarket\s+positioning\b/gi, replacement: "market position" },
  { phrase: "significant activity", pattern: /\bsignificant\s+activity\b/gi, replacement: "activity" },
  { phrase: "state-of-the-art", pattern: /\bstate[\s-]of[\s-]the[\s-]art\b/gi, replacement: "modern (requires verification)" },
  {
    phrase: "deliver value to stakeholders",
    pattern: /\bdeliver(?:s|ed|ing)?\s+value\s+to\s+(?:stakeholders|shareholders)\b/gi,
    replacement: "deliver on disclosed priorities",
  },
];

function cleanLine(line: string, tally: Map<string, number>): string {
  let out = line;
  for (const rule of CLEANUP_RULES) {
    const matches = out.match(rule.pattern);
    if (matches && matches.length > 0) {
      tally.set(rule.phrase, (tally.get(rule.phrase) ?? 0) + matches.length);
      out = out.replace(rule.pattern, rule.replacement);
    }
  }
  // Collapse double spaces left by adjective removal.
  return out.replace(/ {2,}/g, " ").replace(/\s+([,.;:])/g, "$1");
}

/**
 * Mark unmapped financial claims (RM amounts and percentages that do not
 * appear in the "Sources Used" section) with "(requires verification)" —
 * across headlines, bullets, body, quote, and About alike.
 */
function markUnmappedNumbers(text: string): { text: string; marked: string[] } {
  const splitMatch = text.match(/\n##\s*Sources\s+Used/i);
  if (!splitMatch || splitMatch.index === undefined) return { text, marked: [] };
  const splitIndex = splitMatch.index;
  let draftPart = text.slice(0, splitIndex);
  const sourcesPart = text.slice(splitIndex);

  const marked: string[] = [];
  const mark = (claim: string, numericKey: string) => {
    if (sourcesPart.includes(numericKey)) return;
    const claimPattern = new RegExp(
      claim.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + String.raw`(?!\s*\(requires verification\))`,
      "g"
    );
    if (claimPattern.test(draftPart)) {
      draftPart = draftPart.replace(claimPattern, `${claim} (requires verification)`);
      marked.push(claim);
    }
  };

  const rmAmounts = Array.from(
    new Set(
      (draftPart.match(/RM\s?\d[\d,]*(?:\.\d+)?(?:\s?(?:billion|million|bn|mil)\b)?/gi) ?? []).map((s) =>
        s.trim()
      )
    )
  );
  for (const amount of rmAmounts) {
    const numeric = amount.replace(/RM\s?/i, "").replace(/\s?(billion|million|bn|mil)\b/i, "").trim();
    mark(amount, numeric);
  }

  const percents = Array.from(new Set(draftPart.match(/\b\d{1,3}(?:\.\d+)?%/g) ?? []));
  for (const percent of percents) {
    mark(percent, percent);
  }

  return { text: draftPart + text.slice(splitIndex), marked };
}

/**
 * Deterministic cleanup of a press release rewrite: removes every hard-banned
 * phrase (line-by-line; URL lines untouched) and marks unmapped RM/% claims.
 */
export function sanitizePrDraft(text: string): CleanupResult {
  const tally = new Map<string, number>();
  const cleaned = text
    .split("\n")
    .map((line) => (/(https?:\/\/)/i.test(line) ? line : cleanLine(line, tally)))
    .join("\n");

  const { text: withMarks, marked } = markUnmappedNumbers(cleaned);

  const replacements: CleanupReplacement[] = Array.from(tally.entries()).map(
    ([phrase, count]) => ({ phrase, count })
  );
  for (const claim of marked) {
    replacements.push({ phrase: `marked unmapped claim: ${claim}`, count: 1 });
  }

  return { text: withMarks, replacements };
}
