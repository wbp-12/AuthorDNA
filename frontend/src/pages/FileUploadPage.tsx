import { useNavigate } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import FileDropZone from "@/components/FileDropZone";
import FileList from "@/components/FileList";
import { useFileStore } from "@/stores/use-file-store";
import { Button } from "@/components/ui/button";

export default function FileUploadPage() {
  const files = useFileStore((s) => s.files);
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col overflow-hidden bg-background pt-16">
      <AppHeader />
      <main className="flex min-h-0 flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg space-y-6">
          <div className="text-center">
            <h1 className="font-serif text-2xl text-ink">Upload Your Writing</h1>
            <p className="mt-2 text-sm text-ink-muted">
              Upload .doc, .docx, or .pdf files to analyze your writing DNA.
            </p>
          </div>

          <FileDropZone />
          <FileList />

          <Button
            size="lg"
            className="w-full font-serif"
            disabled={files.length === 0}
            onClick={() => navigate("/analysis")}
          >
            {files.length === 0 ? "Upload a file to begin" : "Enter Analysis"}
          </Button>
        </div>
      </main>
    </div>
  );
}
