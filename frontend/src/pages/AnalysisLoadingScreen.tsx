import { useEffect, useState } from "react";
import AppHeader from "@/components/AppHeader";
import { Progress } from "@/components/ui/progress";
import { useFileStore } from "@/stores/use-file-store";

const PHASES = [
  { label: "Parsing document structure...", threshold: 15 },
  { label: "Analyzing sentence flow...", threshold: 35 },
  { label: "Evaluating word choice patterns...", threshold: 55 },
  { label: "Measuring tonal consistency...", threshold: 70 },
  { label: "Checking punctuation habits...", threshold: 85 },
  { label: "Building your AuthorDNA profile...", threshold: 100 },
];

export default function AnalysisLoadingScreen() {
  const [progress, setProgress] = useState(0);
  const files = useFileStore((s) => s.files);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + 1;
        return next > 100 ? 100 : next;
      });
    }, 35);
    return () => clearInterval(interval);
  }, []);

  const currentPhase = PHASES.find((p) => progress < p.threshold) ?? PHASES[PHASES.length - 1];
  const fileName = files[0]?.name ?? "";

  return (
    <div className="flex min-h-screen flex-col overflow-hidden bg-background pt-16">
      <AppHeader />
      <main className="flex min-h-0 flex-1 flex-col items-center justify-center px-4">
        <div className="flex flex-col items-center gap-8 text-center">
          {/* Pulsing DNA icon */}
          <div className="animate-pulse">
            <svg
              viewBox="0 0 24 24"
              className="h-16 w-16 text-brand"
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

          <div>
            <h1 className="font-serif text-2xl text-ink">Analyzing Your Writing</h1>
            <p className="mt-1 text-sm italic text-ink-muted">{currentPhase.label}</p>
          </div>

          <div className="w-80">
            <Progress value={progress} className="h-2" />
            <p className="mt-2 text-xs tabular-nums text-ink-muted/70">{progress}%</p>
          </div>

          {fileName && (
            <p className="text-xs text-ink-muted/50">
              Analyzing: {fileName}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
