import React, { useState, useRef, useCallback } from "react";
import {
  Bold,
  Italic,
  Quote,
  Heading,
  List,
  Strikethrough,
  Eye,
  EyeOff,
  Link as LinkIcon,
  HelpCircle,
  Sparkles,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { FormattedReviewText } from "./FormattedReviewText";

export interface ReviewEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minRows?: number;
  label?: string;
  autoFocus?: boolean;
  className?: string;
  textareaClassName?: string;
}

export const ReviewEditor: React.FC<ReviewEditorProps> = ({
  value,
  onChange,
  placeholder = "Write your cinema critique, reflections on cinematography, pacing, performances, or personal connection...",
  minRows = 14,
  label = "Critique & Review Essay",
  autoFocus = false,
  className = "",
  textareaClassName = "",
}) => {
  const [activeTab, setActiveTab] = useState<"write" | "preview">("write");
  const [showCheatsheet, setShowCheatsheet] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Helper: Apply formatting to textarea selection
  const applyFormat = useCallback(
    (prefix: string, suffix: string = "", placeholderText: string = "text", linePrefix: boolean = false) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = value.substring(start, end);

      if (linePrefix) {
        // Line-based formatting (like blockquote '> ' or list '- ')
        const beforeSelection = value.substring(0, start);
        const lastNewline = beforeSelection.lastIndexOf("\n");
        const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;
        const lineEndIndex = value.indexOf("\n", end);
        const fullEnd = lineEndIndex === -1 ? value.length : lineEndIndex;
        const selectedBlock = value.substring(lineStart, fullEnd);

        const lines = selectedBlock.split("\n");
        const allPrefixed = lines.every((l) => l.startsWith(prefix));

        const newBlock = lines
          .map((l) => (allPrefixed ? l.replace(new RegExp(`^${prefix}`), "") : `${prefix}${l}`))
          .join("\n");

        const newValue = value.substring(0, lineStart) + newBlock + value.substring(fullEnd);
        onChange(newValue);

        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(lineStart, lineStart + newBlock.length);
        }, 10);
        return;
      }

      // Inline wrapping formatting (**bold**, *italic*, etc.)
      const isAlreadyWrapped =
        selectedText.startsWith(prefix) && selectedText.endsWith(suffix) && selectedText.length >= prefix.length + suffix.length;

      let replacement = "";
      let newStart = start;
      let newEnd = end;

      if (isAlreadyWrapped) {
        // Unwrap
        replacement = selectedText.substring(prefix.length, selectedText.length - suffix.length);
        newEnd = start + replacement.length;
      } else if (selectedText) {
        // Wrap selected text
        replacement = `${prefix}${selectedText}${suffix}`;
        newEnd = start + replacement.length;
      } else {
        // Insert placeholder
        replacement = `${prefix}${placeholderText}${suffix}`;
        newStart = start + prefix.length;
        newEnd = newStart + placeholderText.length;
      }

      const newValue = value.substring(0, start) + replacement + value.substring(end);
      onChange(newValue);

      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(newStart, newEnd);
      }, 10);
    },
    [value, onChange]
  );

  // Formatting actions
  const handleBold = useCallback(() => applyFormat("**", "**", "bold text"), [applyFormat]);
  const handleItalic = useCallback(() => applyFormat("*", "*", "italic text"), [applyFormat]);
  const handleQuote = useCallback(() => applyFormat("> ", "", "", true), [applyFormat]);
  const handleHeading = useCallback(() => applyFormat("### ", "", "", true), [applyFormat]);
  const handleList = useCallback(() => applyFormat("- ", "", "", true), [applyFormat]);
  const handleStrike = useCallback(() => applyFormat("~~", "~~", "strikethrough"), [applyFormat]);
  const handleSpoiler = useCallback(() => applyFormat("||", "||", "spoiler alert"), [applyFormat]);
  const handleLink = useCallback(() => applyFormat("[", "](https://...)", "link text"), [applyFormat]);

  // Keyboard shortcuts handler (Ctrl+B, Ctrl+I, Ctrl+Q, Ctrl+K, Tab, etc.)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
    const modifier = isMac ? e.metaKey : e.ctrlKey;

    if (modifier && !e.shiftKey && (e.key === "b" || e.key === "B")) {
      e.preventDefault();
      handleBold();
    } else if (modifier && !e.shiftKey && (e.key === "i" || e.key === "I")) {
      e.preventDefault();
      handleItalic();
    } else if (modifier && !e.shiftKey && (e.key === "q" || e.key === "Q")) {
      e.preventDefault();
      handleQuote();
    } else if (modifier && !e.shiftKey && (e.key === "k" || e.key === "K")) {
      e.preventDefault();
      handleLink();
    } else if (modifier && e.shiftKey && (e.key === "s" || e.key === "S")) {
      e.preventDefault();
      handleSpoiler();
    } else if (modifier && !e.shiftKey && (e.key === "h" || e.key === "H")) {
      e.preventDefault();
      handleHeading();
    } else if (e.key === "Tab") {
      // Prevent losing focus on Tab and insert 2 spaces
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = value.substring(0, start) + "  " + value.substring(end);
      onChange(newValue);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  };

  // Word, Character and Reading Time stats
  const trimmed = value.trim();
  const wordCount = trimmed ? trimmed.split(/\s+/).length : 0;
  const charCount = value.length;
  const readingTimeMin = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <div
      className={
        isFullscreen
          ? "fixed inset-0 z-[100] bg-[#07090d] p-4 sm:p-8 flex flex-col space-y-3"
          : `space-y-2 flex flex-col flex-grow ${className}`
      }
    >
      {/* Top Header with Label, Tabs & Format Guide Button */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <label className="text-xs font-inter font-semibold text-zinc-300 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#ff5500]" />
          <span>{label}</span>
        </label>

        <div className="flex items-center gap-2">
          {/* Write vs Preview Mode Tabs */}
          <div className="flex items-center p-0.5 rounded-lg bg-[#0e1118] border border-white/[0.08]">
            <button
              type="button"
              onClick={() => setActiveTab("write")}
              className={`px-3 py-1 rounded-md text-xs font-inter transition-colors cursor-pointer ${
                activeTab === "write"
                  ? "bg-[#ff5500] text-black font-semibold shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Write
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("preview")}
              className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-inter transition-colors cursor-pointer ${
                activeTab === "preview"
                  ? "bg-[#ff5500] text-black font-semibold shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Eye className="w-3 h-3" />
              <span>Preview</span>
            </button>
          </div>

          {/* Review Formatting Help Button */}
          <button
            type="button"
            onClick={() => setShowCheatsheet((prev) => !prev)}
            className="p-1 rounded-lg text-zinc-400 hover:text-[#ff7a29] hover:bg-white/[0.04] transition-colors cursor-pointer"
            title="Formatting Guide & Keyboard Shortcuts"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={() => setIsFullscreen((prev) => !prev)}
            className="p-1 rounded-lg text-zinc-400 hover:text-[#ff7a29] hover:bg-white/[0.04] transition-colors cursor-pointer"
            title={isFullscreen ? "Exit Fullscreen (Esc)" : "Fullscreen Studio Mode"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Cheatsheet Popover */}
      {showCheatsheet && (
        <div className="p-3.5 rounded-2xl bg-[#0c0e14] border border-[#ff5500]/30 text-xs font-inter text-zinc-300 shadow-xl space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-1.5">
            <span className="font-semibold text-white">Review Formatting & Keyboard Shortcuts</span>
            <button
              type="button"
              onClick={() => setShowCheatsheet(false)}
              className="text-zinc-500 hover:text-white cursor-pointer"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
            <div>
              <span className="text-white font-mono font-bold">**bold**</span>
              <span className="text-zinc-500 block">Ctrl+B</span>
            </div>
            <div>
              <span className="text-white font-mono italic">*italic*</span>
              <span className="text-zinc-500 block">Ctrl+I</span>
            </div>
            <div>
              <span className="text-white font-mono">&gt; quote</span>
              <span className="text-zinc-500 block">Ctrl+Q</span>
            </div>
            <div>
              <span className="text-white font-mono">||spoiler||</span>
              <span className="text-zinc-500 block">Ctrl+Shift+S</span>
            </div>
            <div>
              <span className="text-white font-mono">### Heading</span>
              <span className="text-zinc-500 block">Ctrl+H</span>
            </div>
            <div>
              <span className="text-white font-mono">- Bullet</span>
              <span className="text-zinc-500 block">Dash list</span>
            </div>
          </div>
        </div>
      )}

      {/* Editor Main Container */}
      <div className="flex flex-col flex-grow rounded-2xl bg-[#0e1118] border border-white/[0.1] focus-within:border-[#ff5500] focus-within:ring-1 focus-within:ring-[#ff5500] overflow-hidden transition-all shadow-inner">
        
        {/* Formatting Toolbar (Visible in Write Mode) */}
        {activeTab === "write" && (
          <div className="flex items-center gap-1 p-2 bg-[#121620] border-b border-white/[0.06] flex-wrap select-none">
            
            {/* Bold */}
            <button
              type="button"
              onClick={handleBold}
              className="p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-white/[0.08] active:bg-[#ff5500] active:text-black transition-colors cursor-pointer"
              title="Bold (Ctrl+B / ⌘+B)"
            >
              <Bold className="w-4 h-4 stroke-[2.5]" />
            </button>

            {/* Italic */}
            <button
              type="button"
              onClick={handleItalic}
              className="p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-white/[0.08] active:bg-[#ff5500] active:text-black transition-colors cursor-pointer"
              title="Italic (Ctrl+I / ⌘+I)"
            >
              <Italic className="w-4 h-4" />
            </button>

            <div className="h-4 w-px bg-white/[0.1] mx-1" />

            {/* Quote / Blockquote */}
            <button
              type="button"
              onClick={handleQuote}
              className="p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-white/[0.08] active:bg-[#ff5500] active:text-black transition-colors cursor-pointer"
              title="Blockquote (Ctrl+Q / ⌘+Q)"
            >
              <Quote className="w-4 h-4" />
            </button>

            {/* Heading */}
            <button
              type="button"
              onClick={handleHeading}
              className="p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-white/[0.08] active:bg-[#ff5500] active:text-black transition-colors cursor-pointer"
              title="Section Heading (Ctrl+H / ⌘+H)"
            >
              <Heading className="w-4 h-4" />
            </button>

            {/* Bullet List */}
            <button
              type="button"
              onClick={handleList}
              className="p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-white/[0.08] active:bg-[#ff5500] active:text-black transition-colors cursor-pointer"
              title="Bulleted List"
            >
              <List className="w-4 h-4" />
            </button>

            {/* Strikethrough */}
            <button
              type="button"
              onClick={handleStrike}
              className="p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-white/[0.08] active:bg-[#ff5500] active:text-black transition-colors cursor-pointer"
              title="Strikethrough"
            >
              <Strikethrough className="w-4 h-4" />
            </button>

            <div className="h-4 w-px bg-white/[0.1] mx-1" />

            {/* Spoiler Tag */}
            <button
              type="button"
              onClick={handleSpoiler}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 hover:text-white text-xs font-inter transition-colors cursor-pointer"
              title="Spoiler Tag (Ctrl+Shift+S / ⌘+Shift+S)"
            >
              <EyeOff className="w-3.5 h-3.5 text-[#ff7a29]" />
              <span>Spoiler</span>
            </button>

            {/* Link */}
            <button
              type="button"
              onClick={handleLink}
              className="p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-white/[0.08] active:bg-[#ff5500] active:text-black transition-colors cursor-pointer"
              title="Insert Link (Ctrl+K / ⌘+K)"
            >
              <LinkIcon className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Editor Body */}
        {activeTab === "write" ? (
          <textarea
            ref={textareaRef}
            rows={minRows}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            autoFocus={autoFocus}
            required
            className={`w-full flex-grow bg-transparent p-4 sm:p-6 text-sm sm:text-base font-inter text-white placeholder-zinc-500 outline-none leading-relaxed resize-y min-h-[380px] sm:min-h-[480px] ${textareaClassName}`}
          />
        ) : (
          <div className="p-5 sm:p-8 bg-[#07090d] flex-grow min-h-[380px] sm:min-h-[480px] overflow-y-auto">
            {value.trim() ? (
              <FormattedReviewText content={value} />
            ) : (
              <p className="text-zinc-500 text-sm italic font-inter">
                Nothing to preview yet. Switch back to Write tab to begin your critique...
              </p>
            )}
          </div>
        )}

        {/* Bottom Status / Word Count Bar */}
        <div className="px-4 py-2.5 bg-[#121620]/80 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-inter text-zinc-500 flex-wrap gap-2 select-none">
          <div className="flex items-center gap-3">
            <span>
              <strong className="text-zinc-300 font-semibold">{wordCount}</strong> {wordCount === 1 ? "word" : "words"}
            </span>
            <span>·</span>
            <span>
              <strong className="text-zinc-300 font-semibold">{charCount}</strong> characters
            </span>
            <span>·</span>
            <span>~{readingTimeMin} min read</span>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-zinc-500">
            <span className="hidden sm:inline">Supports Markdown & HTML</span>
            <span className="text-[#ff5500]">Cinema Studio Editor</span>
          </div>
        </div>

      </div>
    </div>
  );
};
