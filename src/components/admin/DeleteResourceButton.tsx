"use client";

import { deleteResource } from "@/app/admin/(panel)/actions";

export function DeleteResourceButton({
  category,
  id,
  title,
  hasFile,
}: {
  category: string;
  id: string;
  title: string;
  hasFile: boolean;
}) {
  return (
    <form
      action={deleteResource}
      onSubmit={(event) => {
        const extra = hasFile ? " The uploaded file will be deleted too." : "";
        if (!window.confirm(`Delete “${title}”?${extra} This can't be undone.`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="category" value={category} />
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50"
      >
        Delete this resource
      </button>
    </form>
  );
}
