import Link from "next/link";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/departments", label: "Departments" },
  { href: "/services", label: "Services" },
  { href: "/resources", label: "Resources" },
];

export function Header() {
  return (
    <header className="border-b border-navy-100 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="font-serif text-xl font-bold text-navy-800">
            Berea
          </span>
          <span className="text-sm text-navy-600">
            Seventh-day Adventist Church
          </span>
        </Link>

        <nav aria-label="Primary">
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
      </div>
    </header>
  );
}
