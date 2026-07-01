import Link from "next/link";
import { getCurrentUser } from "@/lib/admin-auth";
import { getUserGameHistory, HISTORY_DAYS } from "@/lib/hourly-game";

export const dynamic = "force-dynamic";

export default async function MyHistoryPage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <section className="mx-auto max-w-md rounded-xl border border-white/10 bg-panel/80 p-5 text-center">
        <h1 className="text-2xl font-black">My History</h1>
        <p className="mt-2 text-sm text-white/60">Login first to see your game history.</p>
        <Link className="mt-5 inline-flex rounded-lg bg-neon px-4 py-3 font-black text-ink" href="/">
          Go Login
        </Link>
      </section>
    );
  }

  const history = await getUserGameHistory(user.id, 100);
  const summary = {
    games: history.length,
    spentPoints: history.reduce((sum, item) => sum + item.spentPoints, 0),
    wonPoints: history.reduce((sum, item) => sum + item.wonPoints, 0),
    lostPoints: history.reduce((sum, item) => sum + item.lostPoints, 0),
    netPoints: history.reduce((sum, item) => sum + item.netPoints, 0)
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-black">My History</h1>
          <p className="mt-1 text-sm text-white/60">
            {user.username} · last {HISTORY_DAYS} days · {summary.games} games · balance {user.points}
          </p>
        </div>
        <Link className="rounded-lg border border-white/10 px-4 py-3 text-center text-sm font-black" href="/">
          Back
        </Link>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Spent", summary.spentPoints],
          ["Won", summary.wonPoints],
          ["Lost", summary.lostPoints],
          ["Net", summary.netPoints]
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-white/10 bg-panel/80 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/45">{label}</p>
            <p className={`mt-2 font-mono text-2xl font-black ${label === "Net" && Number(value) < 0 ? "text-red-200" : "text-white"}`}>
              {value}
            </p>
          </div>
        ))}
      </section>

      <section className="grid gap-3">
        {history.map((item) => {
          const won = item.wonEntries > 0;
          const drawTime = new Intl.DateTimeFormat("en-IN", {
            dateStyle: "medium",
            timeStyle: "short"
          }).format(new Date(item.drawTime));
          return (
            <div key={item.roundId} className="rounded-xl border border-white/10 bg-panel/80 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="break-all font-mono text-xs text-white/50">{item.roundId}</p>
                  <p className="mt-1 text-lg font-black">Winner #{item.winningNumber}</p>
                  <p className="mt-1 text-xs text-white/45">{drawTime}</p>
                </div>
                <span className={`rounded-md px-3 py-2 text-xs font-black ${won ? "bg-neon/15 text-neon" : "bg-red-500/15 text-red-200"}`}>
                  {won ? "Won" : "Lost"}
                </span>
              </div>
              <div className="mt-3 max-h-20 overflow-auto rounded-md bg-white/[0.03] p-2 text-sm text-white/75">
                <span className="font-bold text-white">Numbers Taken:</span> {item.numbers.join(", ")}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                <span className="rounded-md bg-white/[0.03] p-2">Spent {item.spentPoints}</span>
                <span className="rounded-md bg-white/[0.03] p-2">Won {item.wonPoints}</span>
                <span className="rounded-md bg-white/[0.03] p-2">Lost {item.lostPoints}</span>
                <span className={`rounded-md bg-white/[0.03] p-2 font-black ${item.netPoints >= 0 ? "text-neon" : "text-red-200"}`}>
                  Net {item.netPoints}
                </span>
              </div>
            </div>
          );
        })}
        {!history.length && (
          <p className="rounded-xl border border-white/10 bg-panel/80 p-5 text-sm text-white/55">
            No history for current day or previous day.
          </p>
        )}
      </section>
    </div>
  );
}
