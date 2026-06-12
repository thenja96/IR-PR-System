import ReactMarkdown from "react-markdown";

/**
 * Markdown renderer tuned for AI output: clear section hierarchy,
 * scannable lists, striped scrollable tables, and restrained spacing.
 */
export function Markdown({ content }: { content: string }) {
  return (
    <div
      className={[
        "max-w-none overflow-x-auto text-sm leading-relaxed text-foreground/90",
        // Headings — clear hierarchy with separators on major sections
        "[&_h1]:mt-5 [&_h1]:border-b [&_h1]:pb-2 [&_h1]:text-lg [&_h1]:font-semibold [&_h1]:tracking-tight [&_h1:first-child]:mt-0",
        "[&_h2]:mt-6 [&_h2]:flex [&_h2]:items-center [&_h2]:gap-2 [&_h2]:border-b [&_h2]:border-border/70 [&_h2]:pb-1.5 [&_h2]:text-[15px] [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2:first-child]:mt-0",
        "[&_h3]:mt-4 [&_h3]:text-sm [&_h3]:font-semibold",
        "[&_h4]:mt-3 [&_h4]:text-[13px] [&_h4]:font-semibold [&_h4]:text-muted-foreground",
        // Body
        "[&_p]:my-2",
        "[&_strong]:font-semibold [&_strong]:text-foreground",
        "[&_em]:text-muted-foreground",
        // Lists
        "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_ul]:marker:text-teal-600",
        "[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5 [&_ol]:marker:font-medium [&_ol]:marker:text-teal-700",
        "[&_li]:my-0",
        // Tables — striped, bordered, horizontally scrollable via parent
        "[&_table]:my-3 [&_table]:w-full [&_table]:min-w-[480px] [&_table]:border-collapse [&_table]:overflow-hidden [&_table]:rounded-md",
        "[&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:px-2.5 [&_th]:py-1.5 [&_th]:text-left [&_th]:text-xs [&_th]:font-semibold",
        "[&_td]:border [&_td]:border-border [&_td]:px-2.5 [&_td]:py-1.5 [&_td]:align-top [&_td]:text-xs",
        "[&_tbody_tr:nth-child(even)_td]:bg-muted/40",
        // Quotes, rules, code
        "[&_blockquote]:my-3 [&_blockquote]:border-l-2 [&_blockquote]:border-teal-500 [&_blockquote]:bg-accent/50 [&_blockquote]:py-1.5 [&_blockquote]:pl-3 [&_blockquote]:pr-2 [&_blockquote]:text-muted-foreground",
        "[&_hr]:my-5 [&_hr]:border-border",
        "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs [&_code]:font-medium",
        "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2",
      ].join(" ")}
    >
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
