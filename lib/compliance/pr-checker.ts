// PR Compliance Checker v2 — mechanical ruleset for press_release_builder
// output. Prompting alone lets banned phrases slip through; this scanner
// flags them deterministically after generation. Flag-only: nothing blocks
// generation and the press release text is never auto-rewritten.

import type { ComplianceViolation } from "@/types/ai";

const PR_FIX = "Replace adjective/framing with the underlying fact.";

interface PrRule {
  phrase: string;
  pattern: RegExp;
  suggestion?: string;
}

// ── Hard-banned: flagged wherever they appear ─────────────────
const HARD_BANNED: PrRule[] = [
  { phrase: "underscores / underscoring", pattern: /\bunderscor(?:e|es|ed|ing)\b/gi },
  { phrase: "paving the way", pattern: /\bpaving\s+the\s+way\b/gi },
  { phrase: "testament to", pattern: /\btestament\s+to\b/gi },
  { phrase: "further solidifies", pattern: /\bfurther\s+solidif(?:y|ies|ied|ying)\b/gi },
  { phrase: "well-positioned", pattern: /\bwell[\s-]positioned\b/gi },
  { phrase: "positioned well", pattern: /\bpositioned\s+well\b/gi },
  {
    phrase: "positions us well",
    pattern: /\bposition(?:s|ed)?\s+(?:us|it|the\s+(?:company|group))\s+well\b/gi,
  },
  { phrase: "poised", pattern: /\bpoised\b/gi },
  { phrase: "unlocking", pattern: /\bunlock(?:s|ed|ing)?\b/gi },
  { phrase: "robust", pattern: /\brobust\b/gi },
  { phrase: "growth trajectory", pattern: /\bgrowth\s+trajector(?:y|ies)\b/gi },
  { phrase: "impressive", pattern: /\bimpressive\b/gi },
  { phrase: "capitalize on", pattern: /\bcapitali[sz](?:e|es|ed|ing)\s+on\b/gi },
  { phrase: "future opportunities", pattern: /\bfuture\s+opportunit(?:y|ies)\b/gi },
  { phrase: "growth and expansion", pattern: /\bgrowth\s+and\s+expansion\b/gi },
  {
    phrase: "navigating the complexities",
    pattern: /\bnavigat(?:e|es|ed|ing)\s+the\s+complexit(?:y|ies)\b/gi,
  },
  { phrase: "evolving demands / needs", pattern: /\bevolving\s+(?:demands|needs)\b/gi },
  { phrase: "leading player", pattern: /\bleading\s+player\b/gi },
  { phrase: "market positioning", pattern: /\bmarket\s+positioning\b/gi },
  { phrase: "significant activity", pattern: /\bsignificant\s+activity\b/gi },
  { phrase: "state-of-the-art", pattern: /\bstate[\s-]of[\s-]the[\s-]art\b/gi },
  {
    phrase: "deliver value to stakeholders",
    pattern: /\bdeliver(?:s|ed|ing)?\s+value\s+to\s+(?:stakeholders|shareholders)\b/gi,
  },
  { phrase: "strong regional presence", pattern: /\bstrong\s+regional\s+presence\b/gi },
];

// ── Conditional: allowed only directly beside a sourced number ─
const CONDITIONAL: PrRule[] = [
  { phrase: "significant", pattern: /\bsignificant(?:ly)?\b/gi },
  { phrase: "notable", pattern: /\bnotabl[ey]\b/gi },
  { phrase: "strong", pattern: /\bstrong(?:er|est|ly)?\b/gi },
  { phrase: "leading", pattern: /\bleading\b/gi },
  { phrase: "resilience / resilient", pattern: /\bresilien(?:ce|t)\b/gi },
  { phrase: "sustainability", pattern: /\bsustainability\b/gi },
  { phrase: "innovation", pattern: /\binnovation\b/gi },
  { phrase: "commitment", pattern: /\bcommitment\b/gi },
  { phrase: "operational excellence", pattern: /\boperational\s+excellence\b/gi },
  { phrase: "strategic growth", pattern: /\bstrategic\s+growth\b/gi },
];

const CONDITIONAL_FIX =
  "Allowed only directly beside a sourced number or an exact source-supported statement — otherwise replace with the underlying fact.";

// Window (chars each side) in which a number must appear for a conditional
// phrase to count as "directly beside a sourced figure". Kept tight so a
// figure elsewhere in the sentence does not excuse an unrelated adjective.
const NUMBER_WINDOW = 40;

/** Name of the nearest preceding "## " heading, for locating a violation. */
function sectionOf(text: string, index: number): string | undefined {
  const before = text.slice(0, index);
  const headingStart = before.lastIndexOf("\n## ");
  const start = headingStart >= 0 ? headingStart + 4 : before.startsWith("## ") ? 3 : -1;
  if (start < 0) return undefined;
  const lineEnd = text.indexOf("\n", start);
  return text.slice(start, lineEnd > start ? lineEnd : undefined).trim() || undefined;
}

function matchAll(text: string, pattern: RegExp): { match: string; index: number }[] {
  const out: { match: string; index: number }[] = [];
  const re = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    out.push({ match: m[0], index: m.index });
    if (m.index === re.lastIndex) re.lastIndex++;
  }
  return out;
}

export function checkPrCompliance(text: string): ComplianceViolation[] {
  const violations: ComplianceViolation[] = [];

  // URLs are not draft wording — mask them (length-preserving, so section
  // lookups stay valid) before phrase scanning. e.g. ".../robust-report.pdf"
  // must not count as the banned word "robust".
  const scanText = text.replace(/https?:\/\/\S+/gi, (s) => "·".repeat(s.length));

  // 1. Hard-banned phrases.
  // Work on a masked copy afterwards so conditional rules do not re-flag the
  // same span (e.g. "leading" inside "leading player").
  let masked = scanText;
  for (const rule of HARD_BANNED) {
    const hits = matchAll(scanText, rule.pattern);
    if (hits.length > 0) {
      violations.push({
        phrase: rule.phrase,
        count: hits.length,
        suggestion: rule.suggestion ?? PR_FIX,
        severity: "hard",
        section: sectionOf(text, hits[0].index),
      });
      masked = masked.replace(rule.pattern, (s) => "■".repeat(s.length));
    }
  }

  // 2. Conditional phrases — warning unless a number sits in the window.
  for (const rule of CONDITIONAL) {
    const hits = matchAll(masked, rule.pattern).filter(({ match, index }) => {
      const windowText = masked.slice(
        Math.max(0, index - NUMBER_WINDOW),
        index + match.length + NUMBER_WINDOW
      );
      return !/\d/.test(windowText);
    });
    if (hits.length > 0) {
      violations.push({
        phrase: `"${rule.phrase}" without supporting figure`,
        count: hits.length,
        suggestion: CONDITIONAL_FIX,
        severity: "warning",
        section: sectionOf(masked, hits[0].index),
      });
    }
  }

  // 3. Quote safety — inspect the block after each "Suggested quote" label.
  const quoteLabels = matchAll(text, /suggested\s+quote/gi);
  for (const label of quoteLabels) {
    const windowStart = Math.max(0, label.index - 150);
    const nextHeading = text.indexOf("\n## ", label.index);
    const windowEnd = Math.min(
      nextHeading > 0 ? nextHeading : text.length,
      label.index + 800
    );
    const quoteBlock = text.slice(label.index, windowEnd);
    const labelContext = text.slice(windowStart, windowEnd);

    if (/\b(said|commented)\b/i.test(quoteBlock)) {
      violations.push({
        phrase: 'Generated quote attributed with "said"/"commented"',
        count: 1,
        suggestion:
          'Generated quotes are not confirmed speech. Use only: Suggested quote, subject to management approval: "[Quote text]"',
        severity: "hard",
        section: sectionOf(text, label.index),
      });
    }
    if (
      /\b(?:Datuk|Dato'?|Tan\s+Sri|Datin|Dr|Mr|Ms|Mdm|Encik|Puan)\.?\s+[A-Z]/.test(quoteBlock)
    ) {
      violations.push({
        phrase: "Named spokesperson in generated quote",
        count: 1,
        suggestion:
          "Remove the name unless the user explicitly provided this spokesperson; otherwise write: Suggested spokesperson: [requires management confirmation]",
        severity: "warning",
        section: sectionOf(text, label.index),
      });
    }
    if (!/subject\s+to\s+management\s+approval/i.test(labelContext)) {
      violations.push({
        phrase: 'Quote missing "subject to management approval" label',
        count: 1,
        suggestion:
          'Introduce every generated quote as: "Suggested quote, subject to management approval:"',
        severity: "hard",
        section: sectionOf(text, label.index),
      });
    }
  }

  // 4. Source-support check: financial/operational claims in the draft must
  // be traceable in the "Sources Used" section.
  const sourcesSplit = text.split(/\n##\s*Sources\s+Used/i);
  const draftPart = sourcesSplit[0];
  const sourcesPart = sourcesSplit.length > 1 ? sourcesSplit.slice(1).join("\n") : "";

  const unsupported: string[] = [];

  // A claim already marked "(requires verification)" everywhere it appears
  // has been handled — do not re-flag it.
  const isAlreadyMarked = (claim: string) => {
    const escaped = claim.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const anyOccurrence = new RegExp(escaped, "g");
    const unmarked = new RegExp(`${escaped}(?!\\s*\\(requires verification\\))`, "g");
    return anyOccurrence.test(draftPart) && !unmarked.test(draftPart);
  };

  // RM amounts — the numeric token must reappear in Sources Used.
  const rmAmounts = matchAll(draftPart, /RM\s?\d[\d,]*(?:\.\d+)?(?:\s?(?:billion|million|bn|mil)\b)?/gi);
  const seenAmounts = new Set<string>();
  for (const { match } of rmAmounts) {
    const numeric = match.replace(/RM\s?/i, "").replace(/\s?(billion|million|bn|mil)\b/i, "").trim();
    if (seenAmounts.has(numeric)) continue;
    seenAmounts.add(numeric);
    if (!sourcesPart.includes(numeric) && !isAlreadyMarked(match.trim())) {
      unsupported.push(match.trim());
    }
  }

  // Percentages.
  const percents = matchAll(draftPart, /\b\d{1,3}(?:\.\d+)?%/g);
  const seenPercents = new Set<string>();
  for (const { match } of percents) {
    if (seenPercents.has(match)) continue;
    seenPercents.add(match);
    if (!sourcesPart.includes(match) && !isAlreadyMarked(match)) {
      unsupported.push(match);
    }
  }

  // Operational claim terms.
  const CLAIM_TERMS = [
    "order book",
    "unbilled sales",
    "capacity",
    "number of projects",
    "market share",
    "segment contribution",
  ];
  for (const term of CLAIM_TERMS) {
    const inDraft = new RegExp(`\\b${term.replace(/\s+/g, "\\s+")}\\b`, "i").test(draftPart);
    const inSources = new RegExp(`\\b${term.replace(/\s+/g, "\\s+")}\\b`, "i").test(sourcesPart);
    if (inDraft && !inSources) unsupported.push(term);
  }

  // Cap the list so a sparse Sources Used section doesn't drown the UI.
  for (const claim of unsupported.slice(0, 10)) {
    violations.push({
      phrase: `Unmapped claim: ${claim}`,
      count: 1,
      suggestion: "Potential unsupported claim — verify source mapping.",
      severity: "warning",
      section: "Press Release Draft",
    });
  }

  return violations;
}
