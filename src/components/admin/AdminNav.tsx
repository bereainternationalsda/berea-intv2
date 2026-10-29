"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/settings", label: "Site settings" },
  { href: "/admin/sections", label: "Section cards" },
  { href: "/admin/ministries", label: "Ministry cards" },
  { href: "/admin/resources", label: "Resources" },
  { href: "/admin/events", label: "Events" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin" className="mx-auto max-w-5xl px-6">
      <ul className="-mb-px flex gap-1 overflow-x-auto text-sm font-medium">
        {links.map((link) => {
          const active = link.exact
            ? pathname === link.href
            : pathname.startsWith(link.href);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`block whitespace-nowrap border-b-2 px-3 py-3 transition-colors ${
                  active
                    ? "border-navy-800 text-navy-900"
                    : "border-transparent text-navy-700/70 hover:text-navy-900"
                }`}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
