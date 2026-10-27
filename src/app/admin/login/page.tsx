import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { GoogleSignInButton } from "@/components/admin/GoogleSignInButton";
import { getAdminSession } from "@/lib/admin/auth";

export const metadata = { title: "Sign in" };

export default async function AdminLoginPage() {
  // Already signed in? Skip straight to the dashboard.
  if (await getAdminSession()) redirect("/admin");

  return (
    <main className="flex min-h-screen items-center justify-center bg-navy-50 px-6 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-navy-100 bg-white p-8 shadow-md">
        <Image
          src="/images/logos/adventist-symbol--denim.png"
          alt=""
          width={72}
          height={72}
          className="mx-auto h-[72px] w-[72px]"
        />
        <h1 className="mt-4 text-center font-serif text-2xl font-bold text-navy-900">
          Content admin
        </h1>
        <p className="mt-2 text-center text-sm text-navy-700/80">
          Sign in with an authorised Google account to edit the website.
        </p>

        <div className="mt-8">
          <GoogleSignInButton />
        </div>

        <p className="mt-6 text-center text-xs text-navy-700/60">
          <Link href="/" className="hover:text-navy-800">
            &larr; Back to the website
          </Link>
        </p>
      </div>
    </main>
  );
}
