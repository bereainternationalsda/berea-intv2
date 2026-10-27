import Link from "next/link";
import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  back,
  actions,
}: {
  title: string;
  description?: string;
  back?: { href: string; label: string };
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8">
      {back && (
        <Link
          href={back.href}
          className="text-sm font-semibold text-navy-600 hover:text-navy-800"
        >
          &larr; {back.label}
        </Link>
      )}
      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-navy-900">{title}</h1>
          {description && (
            <p className="mt-2 max-w-2xl text-sm text-navy-700/80">{description}</p>
          )}
        </div>
        {actions}
      </div>
    </div>
  );
}
