"use client";

import { useEffect, useMemo, useState } from "react";

function getRemaining(target: string) {
  const diff = Math.max(0, new Date(target).getTime() - Date.now());
  const hours = Math.floor(diff / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  const seconds = Math.floor((diff % 60_000) / 1000);
  return { hours, minutes, seconds, complete: diff === 0 };
}

export function Countdown({ target }: { target: string }) {
  const [remaining, setRemaining] = useState(() => getRemaining(target));

  useEffect(() => {
    const timer = window.setInterval(() => setRemaining(getRemaining(target)), 1000);
    return () => window.clearInterval(timer);
  }, [target]);

  const units = useMemo(
    () => [
      ["HRS", remaining.hours],
      ["MIN", remaining.minutes],
      ["SEC", remaining.seconds]
    ],
    [remaining]
  );

  return (
    <div className="grid grid-cols-3 gap-3" aria-label="Countdown to next draw">
      {units.map(([label, value]) => (
        <div key={label} className="rounded-lg border border-white/10 bg-white/[0.04] p-3 text-center">
          <div className="font-mono text-2xl font-black text-white sm:text-3xl">
            {String(value).padStart(2, "0")}
          </div>
          <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white/45">{label}</div>
        </div>
      ))}
      {remaining.complete && <span className="sr-only">Draw time reached. Refresh for latest result.</span>}
    </div>
  );
}
