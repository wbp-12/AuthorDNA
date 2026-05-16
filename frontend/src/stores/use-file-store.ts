import { create } from "zustand";

export type UploadedFileInfo = {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: number;
};

type FileStore = {
  files: UploadedFileInfo[];
  addFiles: (newFiles: File[]) => { success: boolean; reason?: string };
  removeFile: (id: string) => void;
  clearFiles: () => void;
};

export const fileObjectMap = new Map<string, File>();

function createFileId() {
  const randomUuid = globalThis.crypto?.randomUUID?.();

  if (randomUuid) {
    return randomUuid;
  }

  const randomBytes = new Uint8Array(16);
  globalThis.crypto?.getRandomValues?.(randomBytes);

  const hex = Array.from(randomBytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `file-${Date.now().toString(36)}-${hex || Math.random().toString(36).slice(2)}`;
}

export const useFileStore = create<FileStore>()((set, get) => ({
  files: [],
  addFiles: (newFiles: File[]) => {
    const { files } = get();
    const remaining = 10 - files.length;
    if (remaining <= 0) {
      return { success: false, reason: "Maximum 10 files allowed" };
    }

    const filesToAdd = newFiles.slice(0, remaining);
    const added: UploadedFileInfo[] = [];

    for (const file of filesToAdd) {
      const id = createFileId();
      fileObjectMap.set(id, file);
      added.push({
        id,
        name: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: Date.now(),
      });
    }

    set({ files: [...files, ...added] });
    return { success: true };
  },
  removeFile: (id: string) => {
    fileObjectMap.delete(id);
    set((state) => ({ files: state.files.filter((f) => f.id !== id) }));
  },
  clearFiles: () => {
    fileObjectMap.clear();
    set({ files: [] });
  },
}));
