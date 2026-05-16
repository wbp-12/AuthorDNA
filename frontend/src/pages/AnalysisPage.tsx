import { useEffect, useState } from "react";
import AnalysisLoadingScreen from "./AnalysisLoadingScreen";
import CalibrationPage from "./CalibrationPage";
import DocumentEditor from "@/pages/DocumentEditor";

type Phase = "loading" | "calibration" | "dashboard";

export default function AnalysisPage() {
  const [phase, setPhase] = useState<Phase>("loading");

  useEffect(() => {
    const timer = setTimeout(() => setPhase("calibration"), 3600);
    return () => clearTimeout(timer);
  }, []);

  if (phase === "loading") return <AnalysisLoadingScreen />;
  if (phase === "calibration") return <CalibrationPage onComplete={() => setPhase("dashboard")} />;

  return (
    <div className="flex h-screen flex-col overflow-hidden animate-in fade-in duration-500">
      <div className="min-h-0 flex-1 overflow-hidden">
        <DocumentEditor />
      </div>
    </div>
  );
}
