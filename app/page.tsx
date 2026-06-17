import Link from "next/link";
import { Countdown } from "@/components/Countdown";
import { GameRoomCard } from "@/components/GameRoomCard";
import { NumberDisplay } from "@/components/NumberDisplay";
import { ResultTable } from "@/components/ResultTable";
import { getCurrentStatus } from "@/lib/draw";
import { formatDrawTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let status;
  let error = "";

  try {
    status = await getCurrentStatus();
  } catch (caught) {
    error = caught instanceof Error ? caught.message : "Unable to load draw data";
  }

  if (!status) {
    return (
      <section className="rounded-xl border border-red-400/20 bg-red-500/10 p-5">
        <h1 className="text-2xl font-black">Daily Number Draw</h1>
        <p className="mt-2 text-sm text-red-100">Result board is loading slowly. Please refresh in a moment.</p>
        {process.env.NODE_ENV !== "production" && <p className="mt-2 text-xs text-red-100/70">{error}</p>}
      </section>
    );
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-5 lg:grid-cols-[1.05fr_.95fr] lg:items-stretch">
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5 sm:p-7">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-gold">Daily fun game</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-black leading-tight text-white sm:text-6xl">
            Choose your lucky number.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-white/68">
            Pick any number from 0 to 10000, save it on this device, and check the live result when the countdown ends.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="rounded-md border border-neon/25 bg-neon/10 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-neon">
              0 - 10000
            </span>
            <span className="rounded-md border border-hot/25 bg-hot/10 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-hot">
              4 draws daily
            </span>
            <span className="rounded-md border border-gold/25 bg-gold/10 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-gold">
              Just for fun
            </span>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-white/10 bg-ink/80 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">Next Draw</p>
              <p className="mt-2 text-lg font-black text-neon">{formatDrawTime(status.nextDrawTime)}</p>
              <p className="mt-1 text-sm text-white/60">Draw opens when the countdown reaches zero</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-ink/80 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">Status</p>
              <p className="mt-2 text-lg font-black text-white">Live countdown active</p>
              <p className="mt-1 text-sm text-white/60">Schedule: {status.schedule.join(", ")}</p>
            </div>
          </div>
          <div className="mt-5 rounded-lg border border-white/10 bg-ink/70 p-4 text-sm leading-6 text-white/58">
            No login needed. Your saved pick stays in this browser so the game stays quick and simple.
          </div>
        </div>
        <div className="space-y-4">
          <NumberDisplay value={status.latest?.winningNumber} label="Latest Winning Number" />
          <div className="rounded-xl border border-white/10 bg-panel/75 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/45">Countdown</p>
            <div className="mt-4">
              <Countdown target={status.nextDrawTime} />
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-black">Game Rooms</h2>
          <p className="mt-1 text-sm text-white/58">Each room has its own number range, pick box, and result time.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {status.games.map((item) => (
            <GameRoomCard key={item.game.id} room={item} />
          ))}
        </div>
      </section>

      <section className="grid gap-5">
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-neon">Game Flow</p>
          <h2 className="mt-2 text-2xl font-black text-white">Simple game flow</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              ["1", "Pick", "Select any number from 0 to 10000."],
              ["2", "Save", "Lock the number on your phone or computer."],
              ["3", "Match", "Check the result after the countdown ends."]
            ].map(([step, title, text]) => (
              <div key={step} className="rounded-lg border border-white/10 bg-ink/75 p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-neon font-mono font-black text-ink">
                  {step}
                </div>
                <h3 className="mt-4 font-black text-white">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/58">{text}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-lg border border-gold/20 bg-gold/10 p-4 text-sm leading-6 text-gold/90">
            Tip: use Quick Pick for a random number, or type your own favorite number before the timer ends.
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-2xl font-black">Last 20 Results</h2>
            <p className="mt-1 text-sm text-white/58">Latest published numbers from recent draws.</p>
          </div>
          <Link className="rounded-lg border border-neon/30 px-4 py-3 text-sm font-black text-neon hover:bg-neon/10" href="/results">
            View All Results
          </Link>
        </div>
        <ResultTable results={status.recent} />
      </section>
    </div>
  );
}
