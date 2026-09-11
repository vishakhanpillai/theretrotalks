import React, { useState } from "react";

interface FormattedReviewTextProps {
  content: string;
  className?: string;
  variant?: "default" | "story";
  density?: "dense" | "standard" | "spacious";
  revealSpoilers?: boolean;
  fontClassName?: string;
  isItalic?: boolean;
  textAlign?: "left" | "center" | "justify";
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
function renderInline(text: string, revealSpoilers = false): React.ReactNode[] {
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
      if (revealSpoilers) {
        tokens.push(
          <span key={key} className="bg-[#ff5500]/20 text-zinc-100 border border-[#ff5500]/30 rounded px-1 py-0.5 mx-0.5">
            {renderInline(content, revealSpoilers)}
          </span>
        );
      } else {
        tokens.push(<SpoilerSpan key={key}>{renderInline(content, revealSpoilers)}</SpoilerSpan>);
      }
    } else if (bold1 !== undefined || bold2 !== undefined || bold3 !== undefined) {
      const content = bold1 ?? bold2 ?? bold3;
      tokens.push(<strong key={key} className="text-white font-bold">{renderInline(content, revealSpoilers)}</strong>);
    } else if (italic1 !== undefined || italic2 !== undefined || italic3 !== undefined || italic4 !== undefined) {
      const content = italic1 ?? italic2 ?? italic3 ?? italic4;
      tokens.push(<em key={key} className="text-zinc-100 italic">{renderInline(content, revealSpoilers)}</em>);
    } else if (strike !== undefined) {
      tokens.push(<del key={key} className="line-through text-zinc-500">{renderInline(strike, revealSpoilers)}</del>);
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
  variant = "default",
  density = "dense",
  revealSpoilers = variant === "story",
  fontClassName,
  isItalic,
  textAlign,
}) => {
  if (!content) return null;

  const isStory = variant === "story";

  const activeFont = fontClassName || "font-poppins";
  const activeItalic = isItalic ? "italic" : "";
  const activeAlign =
    textAlign === "left"
      ? "text-left"
      : textAlign === "center"
      ? "text-center"
      : "text-justify [text-align-last:left]";

  // Story density styling profiles:
  const storyContainerSpacing =
    density === "spacious"
      ? "space-y-2.5"
      : density === "standard"
      ? "space-y-2"
      : "space-y-1.5";

  const storyParagraphClass =
    density === "spacious"
      ? `leading-[1.62] text-zinc-100 text-[13px] sm:text-[13.5px] ${activeFont} ${activeItalic} ${activeAlign} drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]`
      : density === "standard"
      ? `leading-[1.52] text-zinc-100 text-[12px] sm:text-[12.5px] ${activeFont} ${activeItalic} ${activeAlign} drop-shadow-[0_2px_7px_rgba(0,0,0,0.95)]`
      : `leading-[1.46] text-zinc-100 text-[11px] sm:text-[11.5px] ${activeFont} ${activeItalic} ${activeAlign} drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]`;

  const storyQuoteClass =
    density === "spacious"
      ? `my-2 pl-3 pr-2 py-1.5 border-l-2 border-[#ff5500] bg-black/40 text-zinc-100 italic rounded-r-lg leading-relaxed text-[12px] ${activeFont} ${activeAlign}`
      : density === "standard"
      ? `my-1.5 pl-2.5 pr-2 py-1 border-l-2 border-[#ff5500] bg-black/40 text-zinc-100 italic rounded-r-md leading-relaxed text-[11px] ${activeFont} ${activeAlign}`
      : `my-1.5 pl-2.5 pr-1.5 py-1 border-l-2 border-[#ff5500] bg-black/40 text-zinc-100 italic rounded-r-md leading-snug text-[10.5px] ${activeFont} ${activeAlign}`;

  const storyListClass =
    density === "spacious"
      ? `my-2 space-y-1 list-disc list-inside text-zinc-100 text-[12.5px] ${activeFont} ${activeAlign}`
      : density === "standard"
      ? `my-1.5 space-y-0.5 list-disc list-inside text-zinc-100 text-[11.5px] ${activeFont} ${activeAlign}`
      : `my-1 space-y-0.5 list-disc list-inside text-zinc-100 text-[11px] ${activeFont} ${activeAlign}`;

  // Split content by paragraphs (two or more newlines)
  const blocks = content.split(/\n{2,}/);

  return (
    <div className={`${isStory ? storyContainerSpacing : "space-y-4"} ${className}`}>
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
              className={
                isStory
                  ? storyQuoteClass
                  : "my-4 pl-4 pr-3 py-2 border-l-2 border-[#ff5500] bg-white/[0.02] text-zinc-300 italic rounded-r-xl leading-relaxed text-sm sm:text-base font-inter"
              }
            >
              {quoteLines.split("\n").map((line, lIdx) => (
                <React.Fragment key={lIdx}>
                  {renderInline(line, revealSpoilers)}
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
              <h2
                key={bIdx}
                className={
                  isStory
                    ? "font-poppins font-bold text-xs sm:text-[13px] text-white pt-0.5 pb-0.5 border-b border-white/10 text-left"
                    : "font-poppins font-bold text-xl sm:text-2xl text-white pt-2 pb-1 border-b border-white/[0.08]"
                }
              >
                {renderInline(hText, revealSpoilers)}
              </h2>
            );
          }
          if (level === 2) {
            return (
              <h3
                key={bIdx}
                className={
                  isStory
                    ? "font-poppins font-bold text-[11px] sm:text-xs text-[#ff7a29] pt-0.5 text-left"
                    : "font-poppins font-bold text-lg sm:text-xl text-white pt-2"
                }
              >
                {renderInline(hText, revealSpoilers)}
              </h3>
            );
          }
          return (
            <h4
              key={bIdx}
              className={
                isStory
                  ? "font-poppins font-semibold text-[10.5px] text-zinc-100 pt-0.5 text-left"
                  : "font-poppins font-semibold text-base sm:text-lg text-zinc-100 pt-1"
              }
            >
              {renderInline(hText, revealSpoilers)}
            </h4>
          );
        }

        // Check for bullet list: lines starting with "- " or "* "
        const lines = trimmed.split("\n");
        const isList = lines.every((l) => l.trim().startsWith("- ") || l.trim().startsWith("* "));
        if (isList) {
          return (
            <ul
              key={bIdx}
              className={
                isStory
                  ? storyListClass
                  : "my-3 space-y-1.5 list-disc list-inside text-zinc-200 text-sm sm:text-base"
              }
            >
              {lines.map((l, lIdx) => {
                const itemText = l.trim().replace(/^[-*]\s+/, "");
                return <li key={lIdx}>{renderInline(itemText, revealSpoilers)}</li>;
              })}
            </ul>
          );
        }

        // Normal paragraph (render with internal single line-breaks if any)
        return (
          <p
            key={bIdx}
            className={
              isStory
                ? storyParagraphClass
                : "leading-[1.9] text-zinc-200 text-base sm:text-lg"
            }
          >
            {lines.map((line, lIdx) => (
              <React.Fragment key={lIdx}>
                {renderInline(line, revealSpoilers)}
                {lIdx < lines.length - 1 && <br />}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
};
