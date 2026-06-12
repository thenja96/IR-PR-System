// Rule-based compliance checker for all client-facing output.
// Calculations and phrase detection are done in code; AI is only used
// (optionally) to rewrite flagged passages.

import type { ComplianceResult, ComplianceViolation } from "@/types/ai";

interface BannedRule {
  phrase: string;
  pattern: RegExp;
  suggestion: string;
}

export const BANNED_RULES: BannedRule[] = [
  { phrase: "Strong Buy", pattern: /\bstrong\s+buy\b/gi, suggestion: "Key observation" },
  { phrase: "Buy call", pattern: /\bbuy\s+(call|rating|recommendation)\b/gi, suggestion: "Key observation" },
  { phrase: "Sell call", pattern: /\bsell\s+(call|rating|recommendation)\b/gi, suggestion: "Market watchpoint" },
  { phrase: "Hold rating", pattern: /\bhold\s+(call|rating|recommendation)\b/gi, suggestion: "Market watchpoint" },
  { phrase: "Buy/Sell/Hold", pattern: /\b(buy|sell|hold)\b(?=\s*(\/|or\s+(buy|sell|hold))| this stock| the stock| the shares| now\b)/gi, suggestion: "Key observation / investor concern" },
  { phrase: "Target Price", pattern: /\btarget\s+price\b/gi, suggestion: "Valuation watchpoint" },
  { phrase: "Fair Value", pattern: /\bfair\s+value\b/gi, suggestion: "Valuation watchpoint" },
  { phrase: "Accumulate", pattern: /\baccumulate\b/gi, suggestion: "Market watchpoint" },
  { phrase: "Take Profit", pattern: /\btake\s+profit\b/gi, suggestion: "Market watchpoint" },
  { phrase: "Cut Loss", pattern: /\bcut\s+loss\b/gi, suggestion: "Risk factor" },
  { phrase: "Must go up", pattern: /\bmust\s+go\s+up\b/gi, suggestion: "Key observation (remove certainty language)" },
  { phrase: "Surely increase", pattern: /\bsurely\s+(increase|rise|go\s+up)\b/gi, suggestion: "Key observation (remove certainty language)" },
  { phrase: "Guaranteed upside", pattern: /\bguaranteed\s+(upside|return|gain|profit)s?\b/gi, suggestion: "Requires verification (remove guarantee language)" },
  { phrase: "Sure win", pattern: /\bsure\s+win\b/gi, suggestion: "Remove — not compliant" },
  { phrase: "Entry price", pattern: /\bentry\s+price\b/gi, suggestion: "Market watchpoint" },
  { phrase: "Exit price", pattern: /\bexit\s+price\b/gi, suggestion: "Market watchpoint" },
  { phrase: "Trading call", pattern: /\btrading\s+call\b/gi, suggestion: "Suggested IR action" },
  { phrase: "Undervalued — buy", pattern: /\b(undervalued|cheap)\s*[,—-]?\s*(buy|accumulate)\b/gi, suggestion: "Valuation watchpoint" },
];

/** Phrases that should be flagged for review but not auto-replaced */
const FLAG_ONLY_PATTERNS: BannedRule[] = [
  { phrase: "Unsupported certainty", pattern: /\b(definitely|certainly|no doubt)\s+(will|going to)\b/gi, suggestion: "Rewrite as balanced observation; mark as requires verification" },
  { phrase: "Hype language", pattern: /\b(skyrocket|moon|explosive growth|massive upside)\b/gi, suggestion: "Rewrite into balanced professional wording" },
];

export function checkCompliance(text: string): ComplianceResult {
  const violations: ComplianceViolation[] = [];
  let sanitized = text;

  for (const rule of BANNED_RULES) {
    const matches = text.match(rule.pattern);
    if (matches && matches.length > 0) {
      violations.push({
        phrase: rule.phrase,
        count: matches.length,
        suggestion: rule.suggestion,
      });
      sanitized = sanitized.replace(rule.pattern, `[${rule.suggestion}]`);
    }
  }

  for (const rule of FLAG_ONLY_PATTERNS) {
    const matches = text.match(rule.pattern);
    if (matches && matches.length > 0) {
      violations.push({
        phrase: rule.phrase,
        count: matches.length,
        suggestion: rule.suggestion,
      });
    }
  }

  return {
    hasViolations: violations.length > 0,
    violations,
    sanitizedText: sanitized,
  };
}

export const REPLACEMENT_VOCABULARY = [
  "Key observation",
  "Market watchpoint",
  "Investor concern",
  "Communication opportunity",
  "Valuation watchpoint",
  "Suggested IR action",
  "Suggested PR angle",
  "Requires management confirmation",
  "Requires verification",
];
