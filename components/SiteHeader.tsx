import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-white/10 bg-ink/75 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="font-mono text-lg font-black text-white">
          Daily<span className="text-neon">Number</span>Draw
        </Link>
        <div className="flex items-center gap-2 text-sm font-semibold text-white/70">
          <Link className="rounded-md px-3 py-2 hover:bg-white/10 hover:text-white" href="/results">
            Results
          </Link>
        </div>
      </nav>
    </header>
  );
}
