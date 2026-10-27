"use client";

import { deleteRegistration } from "@/app/admin/(panel)/actions";

export function DeleteRegistrationButton({
  slug,
  id,
  label,
}: {
  slug: string;
  id: string;
  label: string;
}) {
  return (
    <form
      action={deleteRegistration}
      onSubmit={(event) => {
        if (!window.confirm(`Delete the registration from ${label} (${id})? This can't be undone.`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50"
      >
        Delete
      </button>
    </form>
  );
}
