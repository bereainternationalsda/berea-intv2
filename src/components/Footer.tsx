import Image from "next/image";

export function Footer() {
  return (
    <footer className="mt-auto bg-navy-950 text-navy-100">
      <div className="mx-auto max-w-6xl px-6 py-10 text-sm">
        <div className="flex items-center gap-3">
          <Image
            src="/images/logos/adventist-symbol--white.png"
            alt="Seventh-day Adventist Church symbol"
            width={36}
            height={36}
            className="h-9 w-9 shrink-0"
          />
          <p className="font-serif text-lg text-white">
            Berea International Seventh-day Adventist Church
          </p>
        </div>
        <p className="mt-4 max-w-md text-navy-100/80">
          A community devoted to helping people understand the Bible to find
          freedom, healing, and hope in Jesus Christ.
        </p>
        <p className="mt-6 text-xs text-navy-100/60">
          &copy; {new Date().getFullYear()} Berea International Seventh-day
          Adventist Church. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
