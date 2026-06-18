export function NumberDisplay({
  value,
  label,
  gameName
}: {
  value?: string | null;
  label: string;
  gameName?: string | null;
}) {
  const digits = (value || "----").split("");

  return (
    <section className="scanline rounded-xl border border-neon/25 bg-panel/85 p-5 shadow-glow">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-neon">{label}</p>
        {gameName && (
          <p className="rounded-md border border-gold/25 bg-gold/10 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-gold">
            {gameName}
          </p>
        )}
      </div>
      <div
        className="mt-4 grid gap-2"
        style={{ gridTemplateColumns: `repeat(${digits.length}, minmax(0, 1fr))` }}
        aria-label={value ? `Winning number ${value}` : "No result yet"}
      >
        {digits.map((digit, index) => (
          <div
            key={`${digit}-${index}`}
            className="animate-ticker rounded-lg border border-white/10 bg-ink px-1 py-4 text-center font-mono text-4xl font-black text-white shadow-inner sm:text-6xl"
            style={{ animationDelay: `${index * 70}ms` }}
          >
            {digit}
          </div>
        ))}
      </div>
    </section>
  );
}
