"use client";

import { startTransition, useActionState, useState } from "react";
import { saveResource } from "@/app/admin/(panel)/actions";
import {
  StatusBanner,
  SubmitButton,
  TextAreaField,
  TextField,
} from "@/components/admin/fields";
import { discardUploadedFile, uploadResourceFile } from "@/lib/firebase/upload";
import { idleState } from "@/lib/admin/types";
import {
  ALLOWED_TYPES_TEXT,
  checkFile,
  FILE_ACCEPT,
  formatFileSize,
  MAX_FILE_BYTES,
  normaliseLinkUrl,
  resourceMeta,
  type ResourceItem,
} from "@/lib/resources/files";

type Uploaded = { path: string; file: File };

export function ResourceForm({
  category,
  mode,
  initial,
}: {
  category: { slug: string; title: string };
  mode: "create" | "edit";
  initial?: ResourceItem;
}) {
  const isCreate = mode === "create";
  const [state, submit, pending] = useActionState(saveResource, idleState);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [kind, setKind] = useState<"file" | "link">(initial?.kind ?? "file");
  const [linkUrl, setLinkUrl] = useState(initial?.kind === "link" ? initial.url : "");
  const [order, setOrder] = useState(
    typeof initial?.order === "number" ? String(initial.order) : "",
  );

  const [file, setFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  // A file that reached Storage but whose save didn't complete: reused on retry.
  const [uploaded, setUploaded] = useState<Uploaded | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});

  // React-approved way to react to a new server response during render.
  const [seenResponse, setSeenResponse] = useState(0);
  if (state.status !== "idle" && state.at !== seenResponse) {
    setSeenResponse(state.at);
    setProgress(null);
    const fileRejected = state.status === "error" && Boolean(state.fieldErrors?.file);
    if (state.status === "success" || fileRejected) {
      // The saved or rejected file is gone from Storage's point of view.
      setFile(null);
      setUploaded(null);
      setProgress(null);
      setFileInputKey((key) => key + 1);
    }
  }

  const uploading = progress !== null && pending === false && progress < 1;
  const busy = pending || uploading;
  const serverErrors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const errors = { ...serverErrors, ...localErrors };
  const hasExistingFile = !isCreate && initial?.kind === "file";

  function handleFileChange(next: File | null) {
    setLocalErrors((current) => ({ ...current, file: "" }));
    if (uploaded) void discardUploadedFile(uploaded.path);
    setUploaded(null);
    setProgress(null);

    if (next) {
      const problem = checkFile(next.name, next.size);
      if (problem) {
        setLocalErrors((current) => ({ ...current, file: problem }));
        setFile(null);
        setFileInputKey((key) => key + 1);
        return;
      }
    }
    setFile(next);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const found: Record<string, string> = {};
    if (!title.trim()) found.title = "Title is required.";
    if (kind === "link") {
      if (!normaliseLinkUrl(linkUrl)) found.linkUrl = "Enter a full web address starting with https://";
    } else if (!file && !hasExistingFile) {
      found.file = "Choose a file to upload.";
    }
    setLocalErrors(found);
    if (Object.keys(found).length > 0) return;

    const form = event.currentTarget;
    let path = "";
    if (kind === "file" && file) {
      if (uploaded && uploaded.file === file) {
        path = uploaded.path;
      } else {
        setProgress(0);
        try {
          path = await uploadResourceFile(file, category.slug, setProgress);
        } catch (error) {
          setProgress(null);
          setLocalErrors({
            file: error instanceof Error ? error.message : "The file couldn't be uploaded.",
          });
          return;
        }
        setUploaded({ path, file });
      }
    }

    // Built from the form so it carries every named field. The file input has
    // no name on purpose: the file itself goes to Storage, never through here.
    const data = new FormData(form);
    data.set("storagePath", path);
    data.set("fileName", kind === "file" && file ? file.name : "");
    startTransition(() => submit(data));
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      <StatusBanner state={state} />

      <input type="hidden" name="mode" value={mode} />
      <input type="hidden" name="category" value={category.slug} />
      {!isCreate && initial && <input type="hidden" name="id" value={initial.id} />}
      <input type="hidden" name="kind" value={kind} />

      <TextField
        name="title"
        label="Title"
        value={title}
        onChange={setTitle}
        maxLength={120}
        required
        error={errors.title}
      />

      <TextAreaField
        name="description"
        label="Short description (optional)"
        hint="One or two lines shown under the title."
        value={description}
        onChange={setDescription}
        maxLength={400}
        rows={3}
        error={errors.description}
      />

      <fieldset>
        <legend className="text-sm font-semibold text-navy-900">What is it?</legend>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          {(
            [
              ["file", "A file", `Upload a ${ALLOWED_TYPES_TEXT} file for people to download.`],
              ["link", "A link", "Point to a page, video or document somewhere else on the web."],
            ] as const
          ).map(([value, label, hint]) => (
            <label
              key={value}
              className={`cursor-pointer rounded-xl border p-4 transition-colors ${
                kind === value
                  ? "border-navy-800 bg-navy-50"
                  : "border-navy-100 bg-white hover:bg-navy-50"
              }`}
            >
              <input
                type="radio"
                name="kindChoice"
                value={value}
                checked={kind === value}
                onChange={() => setKind(value)}
                className="sr-only"
              />
              <span className="block text-sm font-semibold text-navy-900">{label}</span>
              <span className="mt-1 block text-xs text-navy-700/80">{hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {kind === "link" ? (
        <div>
          <TextField
            name="linkUrl"
            label="Web address"
            hint="Starts with https://"
            value={linkUrl}
            onChange={setLinkUrl}
            maxLength={500}
            placeholder="https://"
            error={errors.linkUrl}
          />
          {hasExistingFile && (
            <p className="mt-2 text-xs font-medium text-amber-800">
              Saving this as a link will remove the file you uploaded before.
            </p>
          )}
        </div>
      ) : (
        <div>
          <label htmlFor="resource-file" className="block text-sm font-semibold text-navy-900">
            {hasExistingFile ? "Replace the file (optional)" : "File"}
          </label>
          <p className="mt-0.5 text-xs text-navy-700/70">
            {ALLOWED_TYPES_TEXT}, up to {formatFileSize(MAX_FILE_BYTES)}.
          </p>

          {hasExistingFile && initial && (
            <p className="mt-2 rounded-lg bg-navy-50 px-3 py-2 text-sm text-navy-800">
              Current file:{" "}
              <a
                href={initial.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-navy-600 hover:text-navy-800"
              >
                {initial.fileName ?? "download"}
              </a>{" "}
              <span className="text-navy-700/70">({resourceMeta(initial)})</span>
            </p>
          )}

          <input
            key={fileInputKey}
            id="resource-file"
            type="file"
            accept={FILE_ACCEPT}
            onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
            disabled={busy}
            aria-invalid={Boolean(errors.file)}
            aria-describedby={errors.file ? "resource-file-error" : undefined}
            className="mt-2 block w-full text-sm text-navy-800 file:mr-4 file:rounded-lg file:border-0 file:bg-navy-800 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-navy-700"
          />

          {file && progress === null && (
            <p className="mt-2 text-xs text-navy-700/80">
              {file.name} · {formatFileSize(file.size)}
            </p>
          )}

          {progress !== null && (
            <div className="mt-3" role="status" aria-live="polite">
              <div className="h-2 overflow-hidden rounded-full bg-navy-100">
                <div
                  className="h-full rounded-full bg-navy-700 transition-[width]"
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-navy-700/80">
                {progress < 1
                  ? `Uploading… ${Math.round(progress * 100)}%`
                  : "Uploaded. Saving…"}
              </p>
            </div>
          )}

          {errors.file && (
            <p id="resource-file-error" className="mt-1 text-xs font-medium text-red-700">
              {errors.file}
            </p>
          )}
        </div>
      )}

      <TextField
        name="order"
        label="Position (optional)"
        hint="Leave blank to list newest first. Give an item a number (1 is the very top) to pin it above the rest."
        type="number"
        value={order}
        onChange={setOrder}
        error={errors.order}
      />

      <SubmitButton busy={busy}>
        {uploading ? "Uploading…" : pending ? "Saving…" : isCreate ? "Add to this category" : "Save changes"}
      </SubmitButton>
    </form>
  );
}
