import { resourceBadge, resourceMeta, type ResourceItem } from "@/lib/resources/files";

/** Every file and link in a category, as rows with one clear button each. */
export function ResourceList({ items }: { items: ResourceItem[] }) {
  if (items.length === 0) {
    return (
      <p className="rounded-2xl border border-navy-100 bg-navy-50 px-6 py-10 text-center text-navy-700">
        Resources for this category are coming soon.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const isLink = item.kind === "link";
        return (
          <li
            key={item.id}
            className="flex flex-col gap-4 rounded-2xl border border-navy-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center"
          >
            <div className="flex min-w-0 flex-1 items-start gap-4">
              <span
                aria-hidden="true"
                className="flex h-12 w-14 shrink-0 items-center justify-center rounded-lg bg-navy-800 text-xs font-bold tracking-wide text-white"
              >
                {resourceBadge(item)}
              </span>
              <div className="min-w-0">
                <h2 className="font-semibold text-navy-900">{item.title}</h2>
                {item.description && (
                  <p className="mt-1 whitespace-pre-line text-sm text-navy-700/90">
                    {item.description}
                  </p>
                )}
                <p className="mt-1 text-xs font-medium text-navy-700/70">
                  {resourceMeta(item)}
                </p>
              </div>
            </div>

            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${isLink ? "Open" : item.fileType === "pdf" ? "Open" : "Download"} ${item.title}`}
              className="shrink-0 rounded-lg border border-navy-800 px-5 py-2.5 text-center text-sm font-semibold text-navy-800 transition-colors hover:bg-navy-800 hover:text-white"
            >
              {isLink ? "Open link ↗" : item.fileType === "pdf" ? "Open PDF" : "Download"}
            </a>
          </li>
        );
      })}
    </ul>
  );
}
