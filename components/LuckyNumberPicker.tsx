"use client";

import { useEffect, useMemo, useState } from "react";

function clampNumber(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 5);
  if (!digits) return "";
  return String(Math.min(10000, Number(digits)));
}

export function LuckyNumberPicker() {
  const [number, setNumber] = useState("777");
  const [savedNumber, setSavedNumber] = useState("");
  const [copied, setCopied] = useState(false);

  const displayNumber = useMemo(() => number || "0", [number]);

  useEffect(() => {
    setSavedNumber(window.localStorage.getItem("daily-draw-pick") || "");
  }, []);

  function quickPick() {
    setNumber(String(Math.floor(Math.random() * 10001)));
  }

  function savePick() {
    window.localStorage.setItem("daily-draw-pick", displayNumber);
    setSavedNumber(displayNumber);
    setCopied(false);
  }

  async function copyNumber() {
    await navigator.clipboard?.writeText(displayNumber);
    setCopied(true);
  }

  return (
    <section className="rounded-xl border border-hot/25 bg-panel/85 p-5 shadow-hot">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-hot">Game Board</p>
          <h2 className="mt-2 text-2xl font-black text-white">Lock your lucky number</h2>
        </div>
        <span className="rounded-md border border-gold/30 bg-gold/10 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-gold">
          0-10000
        </span>
      </div>

      <div
        className="mt-5 grid gap-2"
        style={{ gridTemplateColumns: `repeat(${displayNumber.length}, minmax(0, 1fr))` }}
        aria-label={`Selected number ${displayNumber}`}
      >
        {displayNumber.split("").map((digit, index) => (
          <div
            key={`${digit}-${index}`}
            className="rounded-lg border border-white/10 bg-ink px-1 py-4 text-center font-mono text-4xl font-black text-white sm:text-5xl"
          >
            {digit}
          </div>
        ))}
      </div>

      <label className="mt-5 block">
        <span className="text-sm font-bold text-white/70">Choose number</span>
        <input
          value={number}
          onChange={(event) => setNumber(clampNumber(event.target.value))}
          inputMode="numeric"
          placeholder="0"
          className="mt-2 w-full rounded-lg border border-white/10 bg-ink px-3 py-3 text-center font-mono text-2xl font-black text-white outline-none ring-hot/40 focus:ring-2"
        />
      </label>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <button
          type="button"
          onClick={quickPick}
          className="rounded-lg bg-hot px-4 py-3 font-black text-white hover:brightness-110"
        >
          Quick Pick
        </button>
        <button
          type="button"
          onClick={savePick}
          className="rounded-lg bg-neon px-4 py-3 font-black text-ink hover:brightness-110"
        >
          Save Pick
        </button>
        <button
          type="button"
          onClick={copyNumber}
          className="rounded-lg border border-neon/30 px-4 py-3 font-black text-neon hover:bg-neon/10"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <div className="mt-4 rounded-lg border border-white/10 bg-ink/70 p-4">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">Saved Pick</p>
        <p className="mt-2 font-mono text-2xl font-black text-gold">{savedNumber || "No number saved"}</p>
      </div>
    </section>
  );
}
