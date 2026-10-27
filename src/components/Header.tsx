"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/departments", label: "Departments" },
  { href: "/services", label: "Services" },
  { href: "/resources", label: "Resources" },
];

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="border-b border-navy-100 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          onClick={() => setMenuOpen(false)}
          className="flex items-center gap-3"
        >
          <Image
            src="/images/logos/adventist-symbol--denim.png"
            alt="Seventh-day Adventist Church symbol"
            width={88}
            height={88}
            className="h-20 w-20 shrink-0 sm:h-[88px] sm:w-[88px]"
          />
          <span className="flex flex-col leading-tight">
            <span className="whitespace-nowrap font-serif text-base font-bold text-navy-900 sm:text-xl">
              Berea International
            </span>
            <span className="hidden text-xs font-semibold uppercase tracking-wide text-navy-600 sm:block">
              Seventh-day Adventist Church
            </span>
          </span>
        </Link>

        <nav aria-label="Primary" className="hidden sm:block">
          <ul className="flex items-center gap-8 text-sm font-medium text-navy-800">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="transition-colors hover:text-navy-600"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-label="Toggle navigation menu"
          className="flex h-10 w-10 shrink-0 flex-col items-center justify-center gap-1.5 rounded-lg sm:hidden"
        >
          <span
            className={`h-0.5 w-6 bg-navy-800 transition-transform ${menuOpen ? "translate-y-2 rotate-45" : ""}`}
          />
          <span
            className={`h-0.5 w-6 bg-navy-800 transition-opacity ${menuOpen ? "opacity-0" : ""}`}
          />
          <span
            className={`h-0.5 w-6 bg-navy-800 transition-transform ${menuOpen ? "-translate-y-2 -rotate-45" : ""}`}
          />
        </button>
      </div>

      {menuOpen && (
        <nav aria-label="Mobile" className="border-t border-navy-100 sm:hidden">
          <ul className="flex flex-col px-6 py-2 text-sm font-medium text-navy-800">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-lg px-2 py-3 transition-colors hover:bg-navy-50 hover:text-navy-600"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
