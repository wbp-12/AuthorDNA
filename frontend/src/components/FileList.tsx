import { FileText, X } from "lucide-react";
import { useFileStore, type UploadedFileInfo } from "@/stores/use-file-store";
import { formatFileSize } from "@/lib/file-validation";

function formatType(name: string) {
  const ext = name.split(".").pop()?.toUpperCase();
  return ext ?? "";
}

function FileRow({ file }: { file: UploadedFileInfo }) {
  const removeFile = useFileStore((s) => s.removeFile);

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-soft transition hover:border-brand/40">
      <FileText className="h-5 w-5 shrink-0 text-brand" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-serif text-sm text-foreground">{file.name}</p>
        <p className="text-xs text-foreground/50">{formatFileSize(file.size)}</p>
      </div>
      <span className="shrink-0 rounded-full border border-border bg-background px-2.5 py-0.5 text-[11px] font-medium uppercase text-foreground/50">
        {formatType(file.name)}
      </span>
      <button
        type="button"
        onClick={() => removeFile(file.id)}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-foreground/50 transition hover:bg-background hover:text-foreground"
        aria-label={`Remove ${file.name}`}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function FileList() {
  const files = useFileStore((s) => s.files);

  if (files.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-ink-muted">
          {files.length} of 10 files
        </p>
      </div>
      <div className="space-y-2">
        {files.map((file) => (
          <FileRow key={file.id} file={file} />
        ))}
      </div>
    </div>
  );
}
