"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const MAX_EDGE = 2400; // plenty for a full-width hero on a large screen
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // keep in step with the server limit

/** Shrinks big photos in the browser so uploads are quick and under the limit. */
async function prepareImage(file: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size <= 1.5 * 1024 * 1024) {
    bitmap.close();
    return file;
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  // Keep PNGs as PNGs (they may be transparent); everything else becomes JPEG.
  const type = file.type === "image/png" ? "image/png" : "image/jpeg";
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, type, 0.85),
  );
  if (!blob || blob.size >= file.size) return file;

  const extension = type === "image/png" ? "png" : "jpg";
  const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
  return new File([blob], `${baseName}.${extension}`, { type });
}

type ImageFieldProps = {
  label: string;
  hint?: string;
  currentUrl?: string;
  error?: string;
  aspectClass?: string;
  onBusyChange?: (busy: boolean) => void;
};

export function ImageField({
  label,
  hint,
  currentUrl,
  error,
  aspectClass = "aspect-[4/3]",
  onBusyChange,
}: ImageFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [remove, setRemove] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Free the temporary preview URL when it's replaced or the field unmounts.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function clearSelection() {
    if (inputRef.current) inputRef.current.value = "";
    setPreview(null);
  }

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const file = input.files?.[0];
    setLocalError(null);

    if (!file) {
      setPreview(null);
      return;
    }

    onBusyChange?.(true);
    try {
      const prepared = await prepareImage(file);
      if (prepared.size > MAX_UPLOAD_BYTES) {
        clearSelection();
        setLocalError("That image is too large. Please choose one under 5 MB.");
        return;
      }

      // Swap the file the form will submit for the resized one.
      const transfer = new DataTransfer();
      transfer.items.add(prepared);
      input.files = transfer.files;

      setPreview(URL.createObjectURL(prepared));
      setRemove(false);
    } catch {
      clearSelection();
      setLocalError("That file couldn't be read as an image. Try a JPG, PNG or WebP.");
    } finally {
      onBusyChange?.(false);
    }
  }

  const shownUrl = preview ?? (remove ? null : (currentUrl ?? null));
  const shownError = localError ?? error;

  return (
    <div>
      <p className="text-sm font-semibold text-navy-900">{label}</p>
      {hint && <p className="mt-0.5 text-xs text-navy-700/70">{hint}</p>}

      <div
        className={`relative mt-2 w-full max-w-md overflow-hidden rounded-xl border border-navy-100 bg-navy-50 ${aspectClass}`}
      >
        {shownUrl ? (
          <Image
            src={shownUrl}
            alt=""
            fill
            unoptimized
            sizes="448px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-navy-700/60">
            No image
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        name="image"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleChange}
        aria-label={`${label}: choose a file`}
        aria-invalid={Boolean(shownError)}
        className="mt-3 block w-full max-w-md text-sm text-navy-700 file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-navy-800 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-navy-700"
      />

      {currentUrl && !preview && (
        <label className="mt-3 flex items-center gap-2 text-sm text-navy-700">
          <input
            type="checkbox"
            name="removeImage"
            checked={remove}
            onChange={(event) => setRemove(event.target.checked)}
            className="h-4 w-4 rounded border-navy-100"
          />
          Remove the current image
        </label>
      )}

      {shownError && (
        <p role="alert" className="mt-2 text-xs font-medium text-red-700">
          {shownError}
        </p>
      )}
    </div>
  );
}
