import { useEffect, useMemo, useRef, useState } from "react";
import { metrics, sampleText, suggestions, userBaseline } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { Check, X, Sparkles, Activity, FileText, Send, RotateCcw, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Info } from "lucide-react";

function MetricBar({
  score,
  fillColor = "var(--color-brand)",
  trackColor = "var(--color-brand-muted)",
}: {
  score: number;
  fillColor?: string;
  trackColor?: string;
}) {
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: trackColor }}>
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${score}%`, backgroundColor: fillColor }}
      />
    </div>
  );
}

type CategoryColor = {
  fill: string;
  soft: string;
};

const CATEGORY_COLORS: Record<string, CategoryColor> = {
  "Sentence Flow": {
    fill: "oklch(0.74 0.08 190)",
    soft: "oklch(0.95 0.02 190)",
  },
  "Word Choice": {
    fill: "oklch(0.8 0.09 85)",
    soft: "oklch(0.95 0.02 85)",
  },
  Structure: {
    fill: "oklch(0.77 0.07 250)",
    soft: "oklch(0.95 0.02 250)",
  },
  Tone: {
    fill: "oklch(0.76 0.09 22)",
    soft: "oklch(0.95 0.02 22)",
  },
  Punctuation: {
    fill: "oklch(0.76 0.07 335)",
    soft: "oklch(0.95 0.02 335)",
  },
};

function getCategoryColor(category: string) {
  return CATEGORY_COLORS[category] ?? CATEGORY_COLORS["Sentence Flow"];
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeExcerpt(value: string) {
  return value.replace(/^"+|"+$/g, "").replace(/^\.\.\./, "").replace(/\.\.\.$/, "").trim();
}

type Suggestion = (typeof suggestions)[number];

type AcceptedHighlight = {
  text: string;
  color: string;
  token: number;
} | null;

function replaceFirstOccurrence(text: string, search: string, replacement: string) {
  const index = text.indexOf(search);
  if (index === -1) {
    return text;
  }

  return text.slice(0, index) + replacement + text.slice(index + search.length);
}

function applySuggestionAcceptance(draftText: string, suggestion: Suggestion, variation: string) {
  if (suggestion.id === "s1") {
    if (variation.toLowerCase().startsWith("move the paragraph")) {
      const paragraphs = draftText.trim().split(/\n\s*\n/);
      const paragraphIndex = suggestion.paragraphIndex ?? 0;
      const paragraph = paragraphs[paragraphIndex];
      if (!paragraph) {
        return { text: draftText, highlightText: null };
      }

      const nextParagraphs = [...paragraphs];
      nextParagraphs.splice(paragraphIndex, 1);
      nextParagraphs.push(paragraph);

      return {
        text: nextParagraphs.join("\n\n"),
        highlightText: paragraph,
      };
    }

    const paragraphs = draftText.trim().split(/\n\s*\n/);
    const paragraph = paragraphs[suggestion.paragraphIndex ?? 0];
    if (!paragraph) {
      return { text: draftText, highlightText: null };
    }

    const nextParagraphs = [...paragraphs];
    nextParagraphs.splice(suggestion.paragraphIndex ?? 0, 1);
    nextParagraphs.push(variation);

    return {
      text: nextParagraphs.join("\n\n"),
      highlightText: variation,
    };
  }

  if (suggestion.id === "s3") {
    const normalizedVariation = normalizeExcerpt(variation);
    const nextText = replaceFirstOccurrence(
      draftText,
      "a practical extension of writing labor",
      normalizedVariation,
    );

    return {
      text: nextText,
      highlightText: normalizedVariation,
    };
  }

  const nextText = replaceFirstOccurrence(draftText, suggestion.targetText, variation);
  return {
    text: nextText,
    highlightText: variation,
  };
}

function rebuildDocumentText(appliedSuggestionVariations: Record<string, string>) {
  return suggestions.reduce((currentText, suggestion) => {
    const variation = appliedSuggestionVariations[suggestion.id]
    if (!variation) {
      return currentText
    }

    return applySuggestionAcceptance(currentText, suggestion, variation).text
  }, sampleText)
}

function renderFlaggedText(text: string, flaggedTokens: string[]) {
  return text.split(new RegExp(`(${flaggedTokens.map(escapeRegExp).join("|")})`, "g")).map((part, i) => {
    const flagged = flaggedTokens.includes(part);
    return flagged ? (
      <mark
        key={i}
        className="bg-transparent text-ink"
      >
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    );
  });
}

function renderParagraphWithHover(
  paragraph: string,
  flaggedTokens: string[],
  hoverPhrase: string | null,
  hoverColor: string | null,
  pulseToken?: number | null,
) {
  const normalizedHover = hoverPhrase ? normalizeExcerpt(hoverPhrase) : "";
  if (!normalizedHover) {
    return renderFlaggedText(paragraph, flaggedTokens);
  }

  const regex = new RegExp(`(${escapeRegExp(normalizedHover)})`, "i");
  const match = paragraph.match(regex);
  if (!match || match.index == null) {
    return renderFlaggedText(paragraph, flaggedTokens);
  }

  const start = match.index;
  const end = start + match[0].length;
  const before = paragraph.slice(0, start);
  const concern = paragraph.slice(start, end);
  const after = paragraph.slice(end);

  return (
    <>
      {renderFlaggedText(before, flaggedTokens)}
      <mark
        key={`${start}-${end}-${pulseToken ?? "static"}`}
        className={cn(
          "rounded-sm px-0.5 py-0.5 text-ink",
          pulseToken !== null && pulseToken !== undefined && "editor-highlight-pulse",
        )}
        style={{
          backgroundColor: hoverColor ?? CATEGORY_COLORS["Sentence Flow"].soft,
        }}
      >
        {concern}
      </mark>
      {renderFlaggedText(after, flaggedTokens)}
    </>
  );
}

function buildRefineVariations(category: string, generationIndex = 0) {
  switch (category) {
    case "Tone":
      return [
        [
          "Artificial intelligence has fundamentally changed how scholars write.",
          "Artificial intelligence is changing how scholars write.",
          "Artificial intelligence has altered academic writing in important ways.",
        ],
        [
          "Artificial intelligence has redefined academic authorship.",
          "Artificial intelligence has changed scholarly writing significantly.",
          "Artificial intelligence has redefined how scholars approach writing.",
        ],
      ][generationIndex % 2]
    case "Sentence Flow":
      return [
        [
          "Writers can now generate summaries, test outlines, and compare phrasings in seconds. Yet, those efficiencies do not remove the need for judgment.",
          "Writers can now generate summaries, test outlines, and compare phrasings in seconds. Still, judgment remains necessary.",
          "Writers can now generate summaries, test outlines, and compare phrasings in seconds. Even so, judgment still matters.",
        ],
        [
          "The technology has moved quickly from novelty to ordinary tool. That shift has changed how researchers draft, revise, and evaluate their work.",
          "The technology has moved quickly from novelty to ordinary tool. It has changed how researchers draft, revise, and evaluate their work.",
          "The technology has advanced quickly. Researchers now draft, revise, and evaluate their work differently.",
        ],
      ][generationIndex % 2]
    case "Word Choice":
      return [
        [
          "...a practical extension of the writing process...",
          "...a practical extension of writing itself...",
          "...a practical part of the writing process...",
        ],
        [
          "...a useful extension of the writing process...",
          "...a practical part of how people write...",
          "...a direct extension of the writing process...",
        ],
      ][generationIndex % 2]
    case "Structure":
      return [
        [
          "The discussion is no longer only about whether AI should be used. It is about how it should be used, where its limits should be drawn, and how writers can preserve clarity, ownership, and voice while still benefiting from the speed it offers.",
          "The discussion is no longer only about whether AI should be used. It now turns to how it should be used, where its limits should be drawn, and how writers can preserve clarity and voice.",
          "The discussion is no longer only about whether AI should be used. The harder questions are how it should be used and how writers can preserve voice.",
        ],
        [
          "The discussion is no longer only about whether AI should be used. It is now about how it should be used, where its limits should be drawn, and how writers can keep clarity and ownership intact.",
          "The discussion is no longer only about whether AI should be used. It is about the conditions, limits, and tradeoffs that follow.",
          "The discussion is no longer only about whether AI should be used. It is about how writers can use it without losing clarity or voice.",
        ],
      ][generationIndex % 2]
    case "Punctuation":
      return [
        [
          "In many cases, they make judgment more important because the first clear answer is not always the most precise one.",
          "In many cases, they make judgment more important. The first clear answer is not always the most precise one.",
          "In many cases, they make judgment more important; the first clear answer is not always the most precise one.",
        ],
        [
          "Furthermore, the integration of these tools has blurred the boundaries between human creativity and machine assistance. That shift raises essential questions about the future of scholarly communication.",
          "Furthermore, these tools have blurred the boundaries between human creativity and machine assistance. That shift raises essential questions about the future of scholarly communication.",
          "These tools have blurred the boundaries between human creativity and machine assistance. The shift raises essential questions about the future of scholarly communication.",
        ],
      ][generationIndex % 2]
    default:
      return [
        "The proposed wording stays close to the original while making the change more direct.",
        "This version keeps the meaning but tightens the phrasing.",
        "A slightly softer alternative that preserves the original intent.",
      ]
  }
}

export default function InfluenceDashboard() {
  const [resolved, setResolved] = useState<Record<string, "accept" | "reject">>({});
  const [activeRefineId, setActiveRefineId] = useState<string | null>(null);
  const [refinePrompt, setRefinePrompt] = useState("");
  const [refineVariationSets, setRefineVariationSets] = useState<Record<string, string[][]>>({});
  const [refineVariationIndex, setRefineVariationIndex] = useState<Record<string, number>>({});
  const [acceptedRefineVariationBySuggestion, setAcceptedRefineVariationBySuggestion] = useState<Record<string, string>>({});
  const appliedSuggestionVariationsById = useRef<Record<string, string>>({});
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<string | null>(null);
  const [acceptedHighlight, setAcceptedHighlight] = useState<AcceptedHighlight>(null);
  const [documentText, setDocumentText] = useState(sampleText);
  const paragraphRefs = useRef<(HTMLParagraphElement | null)[]>([]);

  const overall = useMemo(
    () => Math.round(metrics.reduce((s, m) => s + m.score, 0) / metrics.length),
    [],
  );

  const visibleMetrics = selectedCategory
    ? metrics.filter((m) => m.name === selectedCategory)
    : metrics;
  const visibleSuggestions = selectedCategory
    ? suggestions.filter((s) => s.category === selectedCategory)
    : suggestions;
  const documentParagraphs = documentText.trim().split(/\n\s*\n/);
  const selectedSuggestion = suggestions.find((s) => s.id === selectedSuggestionId) ?? null;
  const selectedColor = selectedSuggestion ? getCategoryColor(selectedSuggestion.category) : null;
  const selectedTarget = selectedSuggestion?.targetText ?? null;
  const activeHighlight = acceptedHighlight ?? null;
  const activeHighlightText = activeHighlight?.text ?? selectedTarget;
  const activeHighlightColor = activeHighlight?.color ?? (selectedColor ? selectedColor.soft : null);
  const activeHighlightToken = activeHighlight?.token ?? null;
  const flaggedTokens = [
    "seems that",
    "perhaps",
    "proliferation",
    "unprecedented",
    "unimaginable",
    "Furthermore",
  ];

  const handleRefineClick = (id: string) => {
    setActiveRefineId((current) => {
      const next = current === id ? null : id;
      if (next !== current) {
        setRefinePrompt("");
      }
      return next;
    });
  };

  const handleSubmitRefine = (id: string) => {
    const prompt = refinePrompt.trim();
    if (!prompt) {
      return;
    }
    const suggestion = suggestions.find((s) => s.id === id);
    if (!suggestion) {
      return;
    }

    setRefineVariationSets((current) => ({
      ...current,
      [id]: [buildRefineVariations(suggestion.category, 0)],
    }));
    setRefineVariationIndex((current) => ({
      ...current,
      [id]: 0,
    }));
  };

  useEffect(() => {
    if (!acceptedHighlight) {
      return;
    }

    const timer = window.setTimeout(() => setAcceptedHighlight(null), 850);
    return () => window.clearTimeout(timer);
  }, [acceptedHighlight]);

  const handleAcceptVariation = (suggestionId: string, variation: string) => {
    const suggestion = suggestions.find((item) => item.id === suggestionId);
    if (!suggestion) {
      return;
    }

    const applied = applySuggestionAcceptance(documentText, suggestion, variation);
    const nextAppliedSuggestions = {
      ...appliedSuggestionVariationsById.current,
      [suggestionId]: variation,
    };
    appliedSuggestionVariationsById.current = nextAppliedSuggestions;
    setDocumentText(rebuildDocumentText(nextAppliedSuggestions));
    setResolved((current) => ({
      ...current,
      [suggestionId]: "accept",
    }));
    setAcceptedRefineVariationBySuggestion((current) => ({
      ...current,
      [suggestionId]: variation,
    }));
    setSelectedSuggestionId(null);

    if (applied.highlightText) {
      setAcceptedHighlight({
        text: applied.highlightText,
        color: getCategoryColor(suggestion.category).soft,
        token: Date.now(),
      });
    }
  };

  const handleUndoSuggestion = (suggestionId: string) => {
    const suggestion = suggestions.find((item) => item.id === suggestionId);
    if (!suggestion) {
      return;
    }

    const nextAppliedSuggestions = { ...appliedSuggestionVariationsById.current };
    delete nextAppliedSuggestions[suggestionId];
    appliedSuggestionVariationsById.current = nextAppliedSuggestions;
    setDocumentText(rebuildDocumentText(nextAppliedSuggestions));
    setAcceptedHighlight({
      text: suggestion.targetText,
      color: getCategoryColor(suggestion.category).soft,
      token: Date.now(),
    });
    setResolved((current) => {
      const next = { ...current };
      delete next[suggestionId];
      return next;
    });
    setAcceptedRefineVariationBySuggestion((current) => {
      const next = { ...current };
      delete next[suggestionId];
      return next;
    });
    setSelectedSuggestionId(null);
    setActiveRefineId((current) => (current === suggestionId ? null : current));
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* Header */}
      <header className="shrink-0 border-b border-border/60 bg-paper/40 backdrop-blur">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div className="font-serif text-base font-semibold text-ink">AuthorDNA</div>
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5 text-brand"
                aria-hidden="true"
              >
                <path
                  d="M7 4c3 2 7 2 10 4s4 6 0 8-7 2-10 4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M17 4c-3 2-7 2-10 4S3 14 7 16s7 2 10 4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.7"
                />
                <circle cx="12" cy="6" r="1" fill="currentColor" />
                <circle cx="12" cy="18" r="1" fill="currentColor" />
              </svg>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="hidden text-right md:block">
              <div className="text-ink">{userBaseline.name}</div>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-muted text-brand">
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path
                  d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-4 0-7 2.2-7 5v1h14v-1c0-2.8-3-5-7-5Z"
                  fill="currentColor"
                />
              </svg>
            </div>
          </div>
        </div>
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {/* LEFT — A4 document */}
        <section
          className="min-h-0 overflow-y-auto bg-paper/30 px-8 py-8"
          onClick={() => setSelectedSuggestionId(null)}
        >
          <div className="mx-auto flex max-w-[816px] flex-col">
            <div className="mb-3 flex items-center justify-between text-xs text-ink-muted">
              <div className="flex items-center gap-2">
                <FileText className="h-3.5 w-3.5" />
                <span>Writing in the age of AI</span>
                <span className="opacity-60">·</span>
                <span>Auto-saved</span>
              </div>
              <span className="rounded-full bg-brand-muted px-2.5 py-1 text-brand">
                <Activity className="mr-1 inline h-3 w-3" />
                Live analysis
              </span>
            </div>

            {/* A4 page */}
            <div
              className="rounded-sm border border-border bg-card shadow-soft"
              style={{ aspectRatio: "1 / 1.414", minHeight: "1056px" }}
            >
              <div className="px-24 py-20">
                <h1
                  contentEditable
                  suppressContentEditableWarning
                  className="mb-8 font-serif text-3xl font-semibold text-ink outline-none"
                >
                  Writing in the age of AI
                </h1>
                <div
                  contentEditable
                  suppressContentEditableWarning
                  className="font-serif text-[16px] leading-[1.9] text-ink outline-none"
                >
                  {documentParagraphs.map((paragraph, paragraphIndex) => (
                    <p
                      key={paragraphIndex}
                      ref={(node) => {
                        paragraphRefs.current[paragraphIndex] = node;
                      }}
                      className={paragraphIndex === documentParagraphs.length - 1 ? "" : "mb-4"}
                    >
                      {renderParagraphWithHover(
                        paragraph,
                        flaggedTokens,
                        activeHighlightText,
                        activeHighlightColor,
                        activeHighlightToken,
                      )}
                    </p>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-ink-muted">
              <span>{documentText.split(/\s+/).length} words · {documentParagraphs.length} paragraphs</span>
              <span>Page 1 of 1</span>
            </div>
          </div>
        </section>

        {/* RIGHT — Influence Index + Suggestions */}
        <aside className="min-h-0 overflow-y-auto border-l border-border bg-card">
          {/* Influence Index */}
          <div className="border-b border-border p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center">
                <h2 className="font-serif text-[22px] text-ink">DNA Alignment</h2>
                <div className="group relative ml-2 inline-flex items-center">
                  <button
                    type="button"
                    aria-label="What is DNA Alignment?"
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-transparent text-ink-muted/60 transition duration-150 hover:bg-ink/5 hover:text-ink-muted/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/20"
                  >
                    <Info className="h-3 w-3" strokeWidth={2.2} />
                  </button>
                  <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-64 -translate-x-1/2 translate-y-1 rounded-2xl border border-border/70 bg-paper/95 px-3 py-2 text-left text-xs leading-5 text-ink-muted opacity-0 shadow-[0_12px_28px_rgba(15,23,42,0.10)] backdrop-blur transition duration-150 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100">
                    This score measures how closely the current draft matches your established writing style.
                  </div>
                </div>
              </div>
              <span className="font-serif text-[22px] leading-none text-ink">{overall}</span>
            </div>
            <div className="mb-3">
              <MetricBar score={overall} />
            </div>
            <button
              type="button"
              onClick={() =>
                setShowBreakdown((current) => {
                  const next = !current;
                  if (!next) {
                    setSelectedCategory(null);
                  }
                  return next;
                })
              }
              className="flex items-center gap-1 text-xs text-ink-muted transition hover:text-ink"
            >
              {showBreakdown ? (
                <>
                  <ChevronUp className="h-3 w-3" />
                  Hide breakdown
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3" />
                  View breakdown
                </>
              )}
            </button>
            {showBreakdown && (
              <>
                <div className="my-4 border-b border-border/70" />
                <div className="space-y-2.5">
                  {visibleMetrics.map((m) => (
                    <div key={m.id}>
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-xs text-ink">{m.name}</span>
                        <span className="font-serif text-xs tabular-nums text-ink-muted">
                          {m.score}
                        </span>
                      </div>
                      <MetricBar
                        score={m.score}
                        fillColor={getCategoryColor(m.name).fill}
                        trackColor={getCategoryColor(m.name).soft}
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-4 border-t border-border/70 pt-4">
                  <div className="mb-2 text-[11px] uppercase tracking-wider text-ink-muted">
                    Filter suggestions
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedCategory(null)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-[11px] transition",
                        selectedCategory === null
                          ? "border-brand bg-brand-muted/20 text-ink"
                          : "border-border bg-background text-ink-muted hover:text-ink",
                      )}
                    >
                      All
                    </button>
                    {metrics.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedCategory(m.name)}
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-[11px] transition",
                          selectedCategory === m.name ? "text-ink" : "text-ink-muted hover:text-ink",
                        )}
                        style={{
                          borderColor:
                            selectedCategory === m.name
                              ? getCategoryColor(m.name).fill
                              : getCategoryColor(m.name).soft,
                          backgroundColor:
                            selectedCategory === m.name ? getCategoryColor(m.name).soft : "transparent",
                        }}
                      >
                        {m.name}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Suggestions — scrollable */}
          <div>
            <div className="flex items-baseline justify-between border-b border-border px-5 py-3">
              <h3 className="font-serif text-sm text-ink">
                Suggestions <span className="text-ink-muted">· {visibleSuggestions.length}</span>
              </h3>
              <span className="text-[11px] text-ink-muted">Accept, dismiss, refine</span>
            </div>
            <div className="space-y-2.5 p-4">
              {visibleSuggestions.map((s) => {
                const state = resolved[s.id];
                const categoryColor = getCategoryColor(s.category);
                const isSelected = selectedSuggestionId === s.id;
                return (
                  <div
                    key={s.id}
                    className={cn(
                      "rounded-lg border p-3.5 transition-all",
                      state === "accept" && "border-brand/40 bg-brand-muted/30",
                      state === "reject" && "opacity-60",
                      !state &&
                        cn(
                          "border-border bg-background",
                          isSelected ? "border-brand" : "hover:border-brand/50",
                        ),
                    )}
                    onClick={() => {
                      setSelectedSuggestionId(s.id);
                      const paragraphIndex = s.paragraphIndex ?? 0;
                      window.requestAnimationFrame(() => {
                        paragraphRefs.current[paragraphIndex]?.scrollIntoView({
                          behavior: "smooth",
                          block: "center",
                        });
                      });
                    }}
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: categoryColor.fill }} />
                      <span className="text-[10px] font-medium uppercase tracking-wider text-ink-muted">
                        {s.category}
                      </span>
                      {state && (
                        <div className="ml-auto flex items-center gap-2 text-[10px] font-medium text-ink-muted">
                          <span>
                            {state === "accept" ? "Accepted" : "Dismissed"}
                          </span>
                          <span>|</span>
                          <button
                            type="button"
                            onClick={() => handleUndoSuggestion(s.id)}
                            className="transition hover:text-ink"
                          >
                            Undo
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="mb-2 line-clamp-2 text-xs italic text-ink-muted">"{s.excerpt}"</p>
                    <p className="mb-2.5 text-xs text-ink">{s.observation}</p>

                    <div className="mb-2.5 rounded-md border border-dashed border-border bg-paper/60 p-2.5">
                      <div className="mb-1 text-[10px] uppercase tracking-wider text-ink-muted">
                        Proposed
                      </div>
                      <p className="font-serif text-[13px] leading-relaxed text-ink">
                        {s.proposed}
                      </p>
                    </div>

                    {!state && (
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleAcceptVariation(s.id, s.proposed)}
                          className="flex items-center justify-center gap-1 rounded-md bg-brand px-2 py-1.5 text-xs font-medium text-brand-foreground transition hover:opacity-90"
                        >
                          <Check className="h-3 w-3" /> Accept
                        </button>
                        <button
                          onClick={() => setResolved((r) => ({ ...r, [s.id]: "reject" }))}
                          className="flex items-center justify-center gap-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs text-ink transition hover:bg-paper"
                        >
                          <X className="h-3 w-3" /> Dismiss
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRefineClick(s.id)}
                          className={cn(
                            "flex items-center justify-center gap-1 rounded-md border px-2 py-1.5 text-xs transition",
                            activeRefineId === s.id
                              ? "border-brand bg-brand-muted/30 text-ink"
                              : "border-border bg-background text-ink hover:bg-paper",
                          )}
                        >
                          <Sparkles className="h-3 w-3" /> Refine
                        </button>
                      </div>
                    )}

                    {activeRefineId === s.id && (
                      <div className="mt-3 border-t border-border pt-3">
                        <div className="mb-1">
                          <div className="font-serif text-sm font-medium text-ink">
                            Refine this suggestion
                          </div>
                          <div className="text-xs text-ink-muted">
                            Tell the AI how you'd like to adjust the proposed text.
                          </div>
                        </div>

                        <div className="relative rounded-md border border-border bg-background px-3 py-2">
                            <textarea
                              value={refinePrompt}
                              onChange={(e) => setRefinePrompt(e.target.value)}
                            placeholder="E.g., Make it more concise..."
                              className="min-h-[56px] w-full resize-none bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted/70"
                            />
                          <button
                            type="button"
                            onClick={() => handleSubmitRefine(s.id)}
                            className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background text-brand transition hover:bg-paper"
                            aria-label="Send refine prompt"
                          >
                            <Send className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {refineVariationSets[s.id] && (
                          <div className="mt-3">
                            <div className="mb-2 flex items-center justify-between">
                              <div>
                                <div className="font-serif text-sm font-medium text-ink">
                                  Here are 3 variations
                                </div>
                                <div className="text-xs text-ink-muted">
                                  Select the one you like best, or refine further.
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  setRefineVariationSets((current) => {
                                    const suggestion = suggestions.find((item) => item.id === s.id)
                                    if (!suggestion) {
                                      return current
                                    }

                                    const sets = current[s.id] ?? [buildRefineVariations(suggestion.category, 0)]

                                    setRefineVariationIndex((currentIndex) => ({
                                      ...currentIndex,
                                      [s.id]: 1,
                                    }))

                                    if (sets.length >= 2) {
                                      return current
                                    }

                                    return {
                                      ...current,
                                      [s.id]: [...sets, buildRefineVariations(suggestion.category, 1)],
                                    }
                                  })
                                }
                                className="flex items-center gap-1 text-xs text-ink-muted transition hover:text-ink"
                              >
                                <RotateCcw className="h-3 w-3" />
                                Regenerate
                              </button>
                            </div>

                            <div className="space-y-2">
                              {(refineVariationSets[s.id]?.[refineVariationIndex[s.id] ?? 0] ?? []).map((variation) => (
                                <div
                                  key={variation}
                                  className="flex items-start gap-3 rounded-md border border-border bg-background px-3 py-2.5"
                                >
                                  <div className="min-w-0 flex-1">
                                    <p className="font-serif text-[13px] leading-snug text-ink">
                                      {variation}
                                    </p>
                                  </div>
                                  {acceptedRefineVariationBySuggestion[s.id] ? (
                                    <button
                                      type="button"
                                      disabled
                                      className="relative shrink-0 rounded-md border border-border bg-background px-3 py-1.5 text-xs text-ink"
                                      aria-label={
                                        acceptedRefineVariationBySuggestion[s.id] === variation
                                          ? "Accepted variation"
                                          : "Rejected variation"
                                      }
                                    >
                                      <span className="invisible">Accept</span>
                                      {acceptedRefineVariationBySuggestion[s.id] === variation ? (
                                        <Check className="absolute inset-0 m-auto h-3.5 w-3.5" />
                                      ) : (
                                        <X className="absolute inset-0 m-auto h-3.5 w-3.5" />
                                      )}
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleAcceptVariation(s.id, variation)}
                                      className="shrink-0 rounded-md border border-border bg-background px-3 py-1.5 text-xs text-ink transition hover:bg-paper"
                                    >
                                      Accept
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>

                            {(refineVariationSets[s.id]?.length ?? 0) > 1 && (
                              <div className="mt-3 flex items-center justify-end gap-1 text-xs text-ink-muted">
                              <button
                                type="button"
                                aria-label="Previous regeneration"
                                disabled={(refineVariationIndex[s.id] ?? 0) === 0}
                                onClick={() =>
                                  setRefineVariationIndex((current) => ({
                                    ...current,
                                    [s.id]: Math.max((current[s.id] ?? 0) - 1, 0),
                                  }))
                                }
                                className="inline-flex h-4 w-4 items-center justify-center p-0 leading-none text-ink-muted transition hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
                                >
                                  <ChevronLeft className="h-3 w-3" />
                              </button>
                                <span className="text-xs font-medium leading-none text-ink-muted transition hover:text-ink">
                                  {(refineVariationIndex[s.id] ?? 0) + 1}/2
                                </span>
                                <button
                                  type="button"
                                  aria-label="Next regeneration"
                                  disabled={(refineVariationIndex[s.id] ?? 0) >= 1}
                                  onClick={() =>
                                    setRefineVariationIndex((current) => ({
                                      ...current,
                                      [s.id]: 1,
                                    }))
                                  }
                                  className="inline-flex h-4 w-4 items-center justify-center p-0 leading-none text-ink-muted transition hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
                                >
                                  <ChevronRight className="h-3 w-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
