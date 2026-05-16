import { useEffect, useMemo, useState } from "react";
import { getAuthorDnaDataset } from "@/lib/author-dna-data";
import type { AuthorDnaDataset, AuthorDnaSuggestion, MetricCategory } from "@/lib/author-dna-data";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Check, RotateCcw, ArrowLeft, Activity, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORY_COLORS: Record<string, { fill: string; soft: string; lightFill: string; lightSoft: string }> = {
  "Sentence Flow": { fill: "var(--category-sf-fill)", soft: "var(--category-sf-soft)" , lightFill: "var(--category-sf-fill-light)",lightSoft: "var(--category-sf-soft-light)"},
  Tone: { fill: "var(--category-tone-fill)", soft: "var(--category-tone-soft)" , lightFill: "var(--category-tone-fill-light)",lightSoft: "var(--category-tone-soft-light)"},
  "Word Choice": { fill: "var(--category-wc-fill)", soft: "var(--category-wc-soft)" , lightFill: "var(--category-wc-fill-light)",lightSoft: "var(--category-wc-soft-light)"},
  Structure: { fill: "var(--category-st-fill)", soft: "var(--category-st-soft)" , lightFill: "var(--category-st-fill-light)",lightSoft: "var(--category-st-soft-light)"},
  Punctuation: { fill: "var(--category-pu-fill)", soft: "var(--category-pu-soft)" , lightFill: "var(--category-pu-fill-light)",lightSoft: "var(--category-pu-soft-light)"},
  default: { fill: "var(--category-default-fill)", soft: "var(--category-default-soft)" , lightFill: "var(--category-default-fill-light)",lightSoft: "var(--category-default-soft-light)"},
};
function getColor(category: string) {
  return CATEGORY_COLORS[category] ?? CATEGORY_COLORS["Sentence Flow"];
}

export default function CalibrationPage({ onComplete }: { onComplete: () => void }) {
  const [dataset, setDataset] = useState<AuthorDnaDataset | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rightMode, setRightMode] = useState<"actions" | "options">("actions");
  const [refinementIndex, setRefinementIndex] = useState(0);
  const [refinedCount, setRefinedCount] = useState(0);
  const [adjustedMetrics, setAdjustedMetrics] = useState<MetricCategory[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    getAuthorDnaDataset()
      .then((nextDataset) => {
        if (!isMounted) {
          return;
        }

        setDataset(nextDataset);
        setAdjustedMetrics(nextDataset.metrics);
        setLoadError(null);
      })
      .catch((error: unknown) => {
        if (!isMounted) {
          return;
        }

        setDataset(null);
        setAdjustedMetrics([]);
        setLoadError(error instanceof Error ? error.message : "Failed to load AuthorDNA dataset");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const suggestions = dataset?.suggestions ?? [];
  const currentSuggestion = suggestions.length > 0 ? suggestions[refinementIndex % suggestions.length] : null;

  const overall = useMemo(
    () => (adjustedMetrics.length > 0 ? Math.round(adjustedMetrics.reduce((s, m) => s + m.score, 0) / adjustedMetrics.length) : 0),
    [adjustedMetrics],
  );

  const buildOptions = (suggestion: AuthorDnaSuggestion | null) => {
    if (!suggestion) {
      return [];
    }

    const cat = suggestion.category;
    const proposed = suggestion.proposed;
    const options = [proposed];

    switch (cat) {
      case "Tone":
        options.push(
          proposed.replace(/^(The|This)\s/, "").replace(/^\w/, (c) => c.toLowerCase()),
          "A more direct version: " + proposed.replace(/^(The|This)\s+\w+\s+has\s+/, ""),
        );
        break;
      case "Sentence Flow":
        options.push(
          proposed.replace(/,\s*and\s+/, ". "),
          proposed.replace(/^[^.]*\./, "").trim(),
        );
        break;
      case "Word Choice":
        options.push(
          proposed.replace(/\bproliferation\b/, "spread").replace(/\bunprecedented\b/, "unusual"),
          proposed.replace(/\bintellectual integrity\b/, "honesty").replace(/\boriginality\b/, "voice"),
        );
        break;
      case "Structure":
        options.push(proposed.replace(/\.\s*/, ". "), proposed + " This shift is already visible.");
        break;
      case "Punctuation":
        options.push(
          proposed.replace(/\s*—\s*/g, " — "),
          proposed.replace(/\s*—\s*/g, " -- "),
        );
        break;
      default:
        options.push("A simpler version of the same idea.", "Keeping the original meaning with cleaner phrasing.");
    }

    return options.slice(0, 3);
  };

  const options = buildOptions(currentSuggestion);

  const handleRefine = () => {
    setRightMode("options");
    setSelectedOption(null);
  };

  const handleBack = () => {
    setRightMode("actions");
    setSelectedOption(null);
  };

  const handleConfirm = () => {
    if (selectedOption === null || !currentSuggestion) return;

    const bonus = Math.floor(Math.random() * 4) + 2;
    const category = currentSuggestion.category;

    setAdjustedMetrics((prev) =>
      prev.map((m) =>
        m.name === category ? { ...m, score: Math.min(100, m.score + bonus) } : m,
      ),
    );

    setRefinementIndex((i) => i + 1);
    setRefinedCount((c) => c + 1);
    setRightMode("actions");
  };

  if (!dataset) {
    return (
      <div
        className="flex h-screen flex-col overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(185,208,255,0.18),_transparent_40%),var(--app-bg-gradient)] pt-16 text-foreground"
        style={{ backgroundImage: "var(--app-top-gradient), var(--app-bg-gradient)" }}
      >
        <AppHeader />
        <main className="flex min-h-0 flex-1 items-center justify-center overflow-hidden px-8 py-8">
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-8 shadow-soft">
            <div className="flex items-center gap-2 text-brand">
              <Activity className="h-4 w-4" />
              <span className="text-xs uppercase tracking-[0.24em]">Calibration</span>
            </div>
            <div className="mt-4 space-y-3">
              <h1 className="font-serif text-2xl text-ink">Loading your calibration profile</h1>
              <p className="max-w-xl text-sm leading-relaxed text-ink-muted">
                We are pulling the shared baseline metrics and suggestion set used by the negotiation view.
              </p>
              {loadError ? <p className="text-sm text-destructive">{loadError}</p> : null}
            </div>
            <div className="mt-6 h-2.5 w-full overflow-hidden rounded-full bg-brand-muted/80">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-brand" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div
      className="flex h-screen flex-col overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(185,208,255,0.18),_transparent_40%),var(--app-bg-gradient)] pt-16 text-foreground"
      style={{ backgroundImage: "var(--app-top-gradient), var(--app-bg-gradient)" }}
    >
      <AppHeader />
      <main className="grid min-h-0 flex-1 grid-cols-[2fr_1fr] overflow-hidden">
        <section className="min-h-0 overflow-y-auto border-r border-border/60 px-8 py-8">
          <div className="mx-auto max-w-2xl space-y-6">
            <div className="flex items-center gap-2 text-brand">
              <Sparkles className="h-4 w-4" />
              <span className="text-xs uppercase tracking-[0.24em]">Calibration pass</span>
            </div>
            <h1 className="font-serif text-3xl text-ink">Your Writing Profile</h1>
            <p className="max-w-xl text-sm leading-relaxed text-ink-muted">
              Compare the baseline signal against the current document, then refine the metrics that feel off.
            </p>

            <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-serif text-lg text-ink">DNA Alignment</h2>
                <span className="font-serif text-2xl text-ink">{overall}</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-brand-muted">
                <div
                  className="h-full rounded-full bg-brand transition-all duration-700"
                  style={{ width: `${overall}%` }}
                />
              </div>
            </div>

            <div className="space-y-3">
              {adjustedMetrics.map((m) => {
                const c = getColor(m.name);
                return (
                  <div key={m.id} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-medium text-ink">{m.name}</span>
                      <span className="font-serif text-sm tabular-nums text-ink-muted">{m.score}</span>
                    </div>
                    <div className="mb-3 h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: c.soft }}>
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${m.score}%`, backgroundColor: c.fill }}
                      />
                    </div>
                    <p className="text-sm leading-relaxed text-ink-muted">{m.observation}</p>
                  </div>
                );
              })}
            </div>

            {refinedCount > 0 && (
              <p className="text-xs text-ink-muted">
                Refined {refinedCount} time{refinedCount > 1 ? "s" : ""}
              </p>
            )}
          </div>
        </section>

        <aside className="flex min-h-0 flex-col overflow-y-auto bg-background/80 p-6 backdrop-blur">
          {rightMode === "actions" ? (
            <div className="flex flex-col gap-4">
              <div className="rounded-2xl border border-border bg-background p-4 shadow-soft">
                <div className="text-xs uppercase tracking-[0.24em] text-ink-muted">Current profile</div>
                <div className="mt-2 font-serif text-lg text-ink">{dataset.profile.name}</div>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{dataset.profile.voiceSummary}</p>
              </div>

              <Button size="lg" className="w-full font-sans" onClick={onComplete}>
                <Check className="mr-2 h-4 w-4" />
                Accept and Continue
              </Button>

              <Button
                size="lg"
                variant="outline"
                className="w-full font-sans text-ink-muted"
                onClick={handleRefine}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Discard and Reanalyze
              </Button>

              {refinedCount > 0 && (
                <p className="text-center text-xs text-ink-muted">
                  Refined {refinedCount} time{refinedCount > 1 ? "s" : ""}
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center gap-1.5 text-xs text-ink-muted transition hover:text-ink"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </button>

              <div>
                <p className="mb-1 text-xs uppercase tracking-wider text-ink-muted">From your text</p>
                <p className="text-sm leading-relaxed text-ink-muted">“{currentSuggestion?.excerpt ?? ""}”</p>
              </div>

              <p className="font-serif text-sm text-ink">How would YOU express this?</p>

              <div className="space-y-2">
                {options.map((opt, i) => {
                  const labels = ["A", "B", "C"];
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedOption(i)}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-all",
                        selectedOption === i
                          ? "border-brand bg-brand-muted/20 shadow-soft"
                          : "border-border bg-background hover:border-brand/40",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-medium transition",
                          selectedOption === i
                            ? "border-brand bg-brand text-brand-foreground"
                            : "border-border text-ink-muted",
                        )}
                      >
                        {labels[i]}
                      </span>
                      <span className="leading-relaxed text-ink">{opt}</span>
                    </button>
                  );
                })}
              </div>

              <Button
                size="lg"
                className="w-full font-serif"
                disabled={selectedOption === null}
                onClick={handleConfirm}
              >
                Confirm
              </Button>
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}
