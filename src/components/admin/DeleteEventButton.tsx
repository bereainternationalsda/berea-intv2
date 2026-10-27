"use client";

import { deleteEvent } from "@/app/admin/(panel)/actions";

export function DeleteEventButton({
  slug,
  title,
}: {
  slug: string;
  title: string;
}) {
  return (
    <form
      action={deleteEvent}
      onSubmit={(event) => {
        if (!window.confirm(`Delete “${title}”? This can't be undone.`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="slug" value={slug} />
      <button
        type="submit"
        className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50"
      >
        Delete this event
      </button>
    </form>
  );
}
