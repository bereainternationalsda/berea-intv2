import Image from "next/image";
import Link from "next/link";

export function Hero() {
  return (
    <section className="relative isolate flex min-h-[70vh] items-end overflow-hidden">
      <Image
        src="/images/hero-church.svg"
        alt="Illustration of a church at dusk"
        fill
        priority
        unoptimized
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-navy-950/80 via-navy-950/30 to-transparent" />

      <div className="relative mx-auto max-w-6xl px-6 pb-16 pt-24 text-white">
        <p className="text-sm font-semibold uppercase tracking-widest text-navy-100/80">
          Welcome home
        </p>
        <h1 className="mt-3 max-w-2xl font-serif text-4xl font-bold leading-tight sm:text-5xl">
          Berea Seventh-day Adventist Church
        </h1>
        <p className="mt-4 max-w-xl text-navy-100/90">
          A place to worship, grow, and belong. Join our family as we
          discover freedom, healing, and hope in Jesus Christ together.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            href="/services"
            className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-navy-900 transition-colors hover:bg-navy-100"
          >
            Plan a Visit
          </Link>
          <Link
            href="/departments"
            className="rounded-full border border-white/60 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            Explore Departments
          </Link>
        </div>
      </div>
    </section>
  );
}
