import Image from "next/image";
import Link from "next/link";
import type { AdminCard } from "@/lib/admin/types";

export function CardRow({
  card,
  href,
  subtitle,
}: {
  card: AdminCard;
  href: string;
  subtitle?: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-4 rounded-xl border border-navy-100 bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
      >
        <div className="relative flex h-14 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-navy-50 text-2xl">
          {card.imageUrl ? (
            <Image
              src={card.imageUrl}
              alt=""
              fill
              unoptimized
              sizes="80px"
              className="object-cover"
            />
          ) : (
            (card.icon ?? "—")
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-navy-900">{card.title}</p>
          <p className="truncate text-xs text-navy-700/70">
            {subtitle ?? `/${card.slug}`}
          </p>
        </div>
        <span className="text-sm font-semibold text-navy-600">Edit &rarr;</span>
      </Link>
    </li>
  );
}
