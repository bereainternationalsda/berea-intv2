import Image from "next/image";
import Link from "next/link";
import { AdminNav } from "@/components/admin/AdminNav";
import { requireAdmin } from "@/lib/admin/auth";
import { signOutAction } from "./actions";

// This guard only covers the first page load: layouts don't re-render on
// client-side navigation. Every page and data function re-checks the session.
export default async function PanelLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await requireAdmin();

  return (
    <div className="min-h-screen bg-navy-50">
      <header className="border-b border-navy-100 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-3">
          <Link href="/admin" className="flex items-center gap-3">
            <Image
              src="/images/logos/adventist-symbol--denim.png"
              alt=""
              width={40}
              height={40}
              className="h-10 w-10"
            />
            <span className="font-serif text-lg font-bold text-navy-900">
              Content admin
            </span>
          </Link>

          <div className="flex items-center gap-4 text-sm">
            <Link
              href="/"
              target="_blank"
              className="font-medium text-navy-700 hover:text-navy-900"
            >
              View website ↗
            </Link>
            <span className="hidden text-navy-700/70 sm:inline">{session.email}</span>
            <form action={signOutAction}>
              <button
                type="submit"
                className="rounded-lg border border-navy-100 px-3 py-1.5 font-medium text-navy-800 transition-colors hover:bg-navy-50"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
        <AdminNav />
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
    </div>
  );
}
