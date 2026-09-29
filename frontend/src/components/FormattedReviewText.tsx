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
    textAlign === "center"
      ? "text-center"
      : textAlign === "justify"
      ? "text-justify [text-align-last:left]"
      : "text-left";

  // Check if slide content is shorter than typical capacity to provide comfortable breathing room
  const isCompact = isStory && content.length < 750;

  // Story density styling profiles (strictly fixed dimensions, no viewport-relative sm: classes):
  const storyParagraphMargin =
    density === "spacious"
      ? (isCompact ? "mb-4 last:mb-0" : "mb-3.5 last:mb-0")
      : density === "standard"
      ? (isCompact ? "mb-3.5 last:mb-0" : "mb-3 last:mb-0")
      : (isCompact ? "mb-3 last:mb-0" : "mb-2.5 last:mb-0");

  const storyParagraphClass =
    density === "spacious"
      ? isCompact
        ? `leading-[1.74] text-zinc-100 text-[13.5px] ${activeFont} ${activeItalic} ${activeAlign} drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]`
        : `leading-[1.66] text-zinc-100 text-[13px] ${activeFont} ${activeItalic} ${activeAlign} drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]`
      : density === "standard"
      ? isCompact
        ? `leading-[1.66] text-zinc-100 text-[12.5px] ${activeFont} ${activeItalic} ${activeAlign} drop-shadow-[0_2px_7px_rgba(0,0,0,0.95)]`
        : `leading-[1.58] text-zinc-100 text-[12px] ${activeFont} ${activeItalic} ${activeAlign} drop-shadow-[0_2px_7px_rgba(0,0,0,0.95)]`
      : isCompact
        ? `leading-[1.60] text-zinc-100 text-[11.5px] ${activeFont} ${activeItalic} ${activeAlign} drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]`
        : `leading-[1.52] text-zinc-100 text-[11px] ${activeFont} ${activeItalic} ${activeAlign} drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]`;

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

  // Normalize newlines: convert CRLF to LF, clean whitespace-only lines, and collapse 3+ newlines
  const normalized = content
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // Split content by paragraphs
  const blocks = normalized.split(/\n\s*\n/);

  return (
    <div className={`${isStory ? "w-full" : "space-y-4"} ${className}`}>
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
                  ? `${storyQuoteClass} mb-2.5 last:mb-0`
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
                    ? "font-poppins font-bold text-[13px] text-white pt-0.5 pb-0.5 mb-2 border-b border-white/10 text-left"
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
                    ? "font-poppins font-bold text-[12px] text-[#ff7a29] pt-0.5 mb-1.5 text-left"
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
                  ? "font-poppins font-semibold text-[11px] text-zinc-100 pt-0.5 mb-1.5 text-left"
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
                  ? `${storyListClass} mb-2.5 last:mb-0`
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

        // Normal paragraph (in story mode, join soft newlines with a single space to preserve continuous typography)
        const storyProse = isStory ? trimmed.replace(/([^\s])\n([^\s])/g, "$1 $2") : trimmed;
        const paragraphLines = storyProse.split("\n");

        return (
          <p
            key={bIdx}
            className={
              isStory
                ? `${storyParagraphClass} ${storyParagraphMargin}`
                : "leading-[1.9] text-zinc-200 text-base sm:text-lg"
            }
          >
            {paragraphLines.map((line, lIdx) => (
              <React.Fragment key={lIdx}>
                {renderInline(line, revealSpoilers)}
                {lIdx < paragraphLines.length - 1 && <br />}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
};
