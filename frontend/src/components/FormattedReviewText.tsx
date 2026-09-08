import React, { useState } from "react";

interface FormattedReviewTextProps {
  content: string;
  className?: string;
}

const SpoilerSpan: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [revealed, setRevealed] = useState(false);

  return (
    <span
      onClick={(e) => {
        e.stopPropagation();
        setRevealed((prev) => !prev);
      }}
      title={revealed ? "Click to re-hide spoiler" : "Spoiler — click to reveal"}
      className={`relative inline rounded px-1.5 py-0.5 mx-0.5 transition-all duration-200 cursor-pointer ${
        revealed
          ? "bg-[#ff5500]/15 text-zinc-100 border border-[#ff5500]/30 shadow-sm"
          : "bg-zinc-800/90 text-transparent select-none filter blur-[4px] hover:blur-[2px] border border-zinc-700"
      }`}
    >
      {children}
    </span>
  );
};

// Parses inline tokens (bold, italics, strikethrough, spoiler, link, line-breaks)
function renderInline(text: string): React.ReactNode[] {
  const tokens: React.ReactNode[] = [];
  // Tokenizer pattern
  // 1. Spoilers: ||text|| or <spoiler>text</spoiler>
  // 2. Bold: **text** or <b>text</b> or <strong>text</strong>
  // 3. Italic: *text* or _text_ or <i>text</i> or <em>text</em>
  // 4. Strikethrough: ~~text~~
  // 5. Link: [text](url)
  const regex = /(\|\|([\s\S]*?)\|\||<spoiler>([\s\S]*?)<\/spoiler>|\*\*([^*]+)\*\*|<b>([\s\S]*?)<\/b>|<strong>([\s\S]*?)<\/strong>|\*([^*]+)\*|_([^_]+)_|<i>([\s\S]*?)<\/i>|<em>([\s\S]*?)<\/em>|~~([^~]+)~~|\[([^\]]+)\]\(([^)]+)\))/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push(text.substring(lastIndex, match.index));
    }

    const [
      ,
      , spoiler1, spoiler2,
      bold1, bold2, bold3,
      italic1, italic2, italic3, italic4,
      strike,
      linkText, linkUrl
    ] = match;

    const key = `token-${match.index}`;

    if (spoiler1 !== undefined || spoiler2 !== undefined) {
      const content = spoiler1 ?? spoiler2;
      tokens.push(<SpoilerSpan key={key}>{renderInline(content)}</SpoilerSpan>);
    } else if (bold1 !== undefined || bold2 !== undefined || bold3 !== undefined) {
      const content = bold1 ?? bold2 ?? bold3;
      tokens.push(<strong key={key} className="text-white font-semibold">{renderInline(content)}</strong>);
    } else if (italic1 !== undefined || italic2 !== undefined || italic3 !== undefined || italic4 !== undefined) {
      const content = italic1 ?? italic2 ?? italic3 ?? italic4;
      tokens.push(<em key={key} className="text-zinc-100 italic">{renderInline(content)}</em>);
    } else if (strike !== undefined) {
      tokens.push(<del key={key} className="line-through text-zinc-500">{renderInline(strike)}</del>);
    } else if (linkText !== undefined && linkUrl !== undefined) {
      tokens.push(
        <a
          key={key}
          href={linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#ff7a29] underline hover:text-[#ff5500] transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          {linkText}
        </a>
      );
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    tokens.push(text.substring(lastIndex));
  }

  return tokens;
}

export const FormattedReviewText: React.FC<FormattedReviewTextProps> = ({
  content,
  className = "",
}) => {
  if (!content) return null;

  // Split content by paragraphs (two or more newlines)
  const blocks = content.split(/\n{2,}/);

  return (
    <div className={`space-y-4 ${className}`}>
      {blocks.map((block, bIdx) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        // Check for blockquote: lines starting with "> " or <blockquote>
        if (trimmed.startsWith("> ") || trimmed.startsWith(">") || trimmed.startsWith("<blockquote>")) {
          const quoteLines = trimmed
            .replace(/^<blockquote>|<\/blockquote>$/g, "")
            .split("\n")
            .map((l) => l.replace(/^>\s?/, ""))
            .join("\n");

          return (
            <blockquote
              key={bIdx}
              className="my-4 pl-4 pr-3 py-2 border-l-2 border-[#ff5500] bg-white/[0.02] text-zinc-300 italic rounded-r-xl leading-relaxed text-sm sm:text-base font-inter"
            >
              {quoteLines.split("\n").map((line, lIdx) => (
                <React.Fragment key={lIdx}>
                  {renderInline(line)}
                  {lIdx < quoteLines.split("\n").length - 1 && <br />}
                </React.Fragment>
              ))}
            </blockquote>
          );
        }

        // Check for headings: ### or ## or #
        const headingMatch = trimmed.match(/^(#{1,3})\s+(.*)$/);
        if (headingMatch) {
          const level = headingMatch[1].length;
          const hText = headingMatch[2];
          if (level === 1) {
            return (
              <h2 key={bIdx} className="font-poppins font-bold text-xl sm:text-2xl text-white pt-2 pb-1 border-b border-white/[0.08]">
                {renderInline(hText)}
              </h2>
            );
          }
          if (level === 2) {
            return (
              <h3 key={bIdx} className="font-poppins font-bold text-lg sm:text-xl text-white pt-2">
                {renderInline(hText)}
              </h3>
            );
          }
          return (
            <h4 key={bIdx} className="font-poppins font-semibold text-base sm:text-lg text-zinc-100 pt-1">
              {renderInline(hText)}
            </h4>
          );
        }

        // Check for bullet list: lines starting with "- " or "* "
        const lines = trimmed.split("\n");
        const isList = lines.every((l) => l.trim().startsWith("- ") || l.trim().startsWith("* "));
        if (isList) {
          return (
            <ul key={bIdx} className="my-3 space-y-1.5 list-disc list-inside text-zinc-200 text-sm sm:text-base">
              {lines.map((l, lIdx) => {
                const itemText = l.trim().replace(/^[-*]\s+/, "");
                return <li key={lIdx}>{renderInline(itemText)}</li>;
              })}
            </ul>
          );
        }

        // Normal paragraph (render with internal single line-breaks if any)
        return (
          <p key={bIdx} className="leading-[1.9] text-zinc-200 text-base sm:text-lg">
            {lines.map((line, lIdx) => (
              <React.Fragment key={lIdx}>
                {renderInline(line)}
                {lIdx < lines.length - 1 && <br />}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
};
