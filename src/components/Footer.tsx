export function Footer() {
  return (
    <footer className="mt-auto bg-navy-950 text-navy-100">
      <div className="mx-auto max-w-6xl px-6 py-10 text-sm">
        <p className="font-serif text-lg text-white">Berea Seventh-day Adventist Church</p>
        <p className="mt-2 max-w-md text-navy-100/80">
          A community devoted to helping people understand the Bible to find
          freedom, healing, and hope in Jesus Christ.
        </p>
        <p className="mt-6 text-xs text-navy-100/60">
          &copy; {new Date().getFullYear()} Berea Seventh-day Adventist Church. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
