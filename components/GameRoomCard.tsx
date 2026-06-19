"use client";

import { useEffect, useMemo, useState } from "react";
import { Countdown } from "@/components/Countdown";
import type { CurrentDrawStatus } from "@/types/result";
import { formatDrawTime } from "@/lib/format";

type GameRoom = CurrentDrawStatus["games"][number];

function clampToRange(value: string, min: number, max: number) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (!digits) return "";
  return String(Math.min(max, Math.max(min, Number(digits))));
}

export function GameRoomCard({ room }: { room: GameRoom }) {
  const [pick, setPick] = useState(String(room.game.minNumber));
  const [savedPick, setSavedPick] = useState("");
  const storageKey = useMemo(() => `daily-draw-pick-${room.game.id}`, [room.game.id]);

  useEffect(() => {
    setSavedPick(window.localStorage.getItem(storageKey) || "");
    setPick(String(room.game.minNumber));
  }, [room.game.minNumber, storageKey]);

  function quickPick() {
    const range = room.game.maxNumber - room.game.minNumber + 1;
    setPick(String(room.game.minNumber + Math.floor(Math.random() * range)));
  }

  function savePick() {
    const value = pick || String(room.game.minNumber);
    window.localStorage.setItem(storageKey, value);
    setSavedPick(value);
  }

  return (
    <div className="rounded-xl border border-white/10 bg-panel/75 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-black text-white">{room.game.name}</h3>
          <p className="mt-1 text-sm text-white/50">
            Choose {room.game.minNumber} to {room.game.maxNumber}
          </p>
        </div>
        <span className="rounded-md border border-neon/25 bg-neon/10 px-3 py-2 text-xs font-black text-neon">
          Live
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-white/10 bg-ink/80 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">Latest Result</p>
          <p className="mt-2 font-mono text-4xl font-black text-gold">{room.latest?.winningNumber || "--"}</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-ink/80 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">Your Saved Pick</p>
          <p className="mt-2 font-mono text-4xl font-black text-neon">{savedPick || "--"}</p>
        </div>
      </div>

      <label className="mt-4 block">
        <span className="text-sm font-bold text-white/70">Pick for this room</span>
        <input
          value={pick}
          onChange={(event) => setPick(clampToRange(event.target.value, room.game.minNumber, room.game.maxNumber))}
          inputMode="numeric"
          className="mt-2 w-full rounded-lg border border-white/10 bg-ink px-3 py-3 text-center font-mono text-2xl font-black text-white outline-none ring-neon/40 focus:ring-2"
        />
      </label>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <button type="button" onClick={quickPick} className="rounded-lg bg-hot px-4 py-3 font-black text-white">
          Quick Pick
        </button>
        <button type="button" onClick={savePick} className="rounded-lg bg-neon px-4 py-3 font-black text-ink">
          Save Pick
        </button>
      </div>

      <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.03] p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/40">Next Winning Result</p>
            <p className="mt-1 text-sm font-bold text-neon">{formatDrawTime(room.nextDrawTime)}</p>
          </div>
          <select
            aria-label={`${room.game.name} result timeline`}
            className="rounded-md border border-white/10 bg-ink px-3 py-2 text-sm font-bold text-white/75 outline-none ring-neon/40 focus:ring-2"
            defaultValue={room.nextDrawTime}
          >
            <option value={room.nextDrawTime}>Next: {formatDrawTime(room.nextDrawTime)}</option>
            {room.schedule.map((time) => (
              <option key={time} value={time}>
                Daily {time}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-3">
          <Countdown target={room.nextDrawTime} compact />
        </div>
        <div className="mt-3 border-t border-white/10 pt-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/40">Past Winning Results</p>
            <div className="flex flex-wrap gap-1.5">
              {room.pastResults.length ? (
                room.pastResults.map((result) => (
                  <span
                    className="rounded border border-gold/25 bg-gold/10 px-2 py-1 font-mono text-xs font-black text-gold"
                    key={result.id}
                  >
                    {result.winningNumber}
                  </span>
                ))
              ) : (
                <span className="font-mono text-sm font-bold text-white/45">--</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
