"use client";

import { useRef, useState } from "react";
import { apiClient } from "@/lib/api";
import { SERVER_URL } from "@/lib/constants";
import { useAuthStore } from "@/hooks/useAuthStore";

type AvatarEditorProps = {
  currentUrl?: string | null;
  onSave: (avatarUrl: string) => Promise<void>;
};

export function AvatarEditor({ currentUrl, onSave }: AvatarEditorProps) {
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const accessToken = useAuthStore((state) => state.accessToken);

  async function handleFile(file: File): Promise<void> {
    if (!file.type.startsWith("image/")) {
      setStatus("Only image files are supported.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setStatus("Image must be under 5MB.");
      return;
    }

    setUploading(true);
    setStatus(null);

    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const { uploadUrl, fileUrl } = await apiClient.post<{ uploadUrl: string; fileUrl: string; key: string }>(
        "/api/media/upload-url",
        { mimeType: file.type, extension: ext }
      );

      // Show local preview immediately
      const localUrl = URL.createObjectURL(file);
      setPreview(localUrl);

      if (!uploadUrl.includes("example.local")) {
        await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file
        });
      }

      await onSave(fileUrl);
      setStatus("Avatar updated");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-xl border border-[var(--border)] p-3">
      <p className="mb-3 text-sm font-medium">Avatar</p>

      <div className="flex items-center gap-4">
        {/* Preview */}
        <div className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-[var(--border)] bg-[var(--bg-secondary)]">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Avatar preview" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl text-[var(--text-muted)]">👤</div>
          )}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs text-white hover:opacity-90 disabled:opacity-60"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? "Uploading…" : "Upload photo"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.currentTarget.value = "";
            }}
          />
        </div>
      </div>

      {status && (
        <p className={`mt-2 text-xs ${status.includes("failed") || status.includes("Only") || status.includes("under") ? "text-red-500" : "text-emerald-500"}`}>
          {status}
        </p>
      )}
    </div>
  );
}
