"use client";

import { useEffect, useMemo, useState } from "react";
import { Countdown } from "./Countdown";
import type { Bet, GameStatus, SessionUser } from "@/types/result";

type MeResponse = {
  user: SessionUser | null;
  status: GameStatus;
};

export function GameBoard({ initialUser, initialStatus }: { initialUser: SessionUser | null; initialStatus: GameStatus }) {
  const [user, setUser] = useState(initialUser);
  const [status, setStatus] = useState(initialStatus);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [selectedCounts, setSelectedCounts] = useState<Record<number, number>>({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [nowMs, setNowMs] = useState(Date.now());
  const canSeeBoardPoints = user?.role === "super_admin";
  const canSeeOwnPoints = Boolean(user);
  const gameRunning = status.game.active !== false;
  const entryLocked = Date.parse(status.entryClosesAt) <= nowMs;
  const selected = useMemo(
    () =>
      Object.entries(selectedCounts).flatMap(([number, count]) => Array.from({ length: count }, () => Number(number))),
    [selectedCounts]
  );

  async function refresh() {
    const response = await fetch("/api/auth/me", { cache: "no-store" });
    if (!response.ok) return;
    const data = (await response.json()) as MeResponse;
    setUser(data.user);
    setStatus(data.status);
  }

  useEffect(() => {
    const timer = window.setInterval(() => void refresh(), 20_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  async function login(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      setMessage(data.error || "Login failed");
      return;
    }
    setUser(data.user);
    setUsername("");
    setPassword("");
    await refresh();
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setSelectedCounts({});
    await refresh();
  }

  function addNumber(number: number) {
    setSelectedCounts((current) => ({ ...current, [number]: (current[number] || 0) + 1 }));
  }

  function removeNumber(number: number) {
    setSelectedCounts((current) => {
      const nextCount = (current[number] || 0) - 1;
      const next = { ...current };
      if (nextCount > 0) next[number] = nextCount;
      else delete next[number];
      return next;
    });
  }

  async function submitBets() {
    setLoading(true);
    setMessage("");
    const response = await fetch("/api/bets", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ numbers: selected })
    });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      setMessage(data.error || "Entry failed");
      return;
    }
    setUser(data.user);
    setStatus(data.status);
    setSelectedCounts({});
    setMessage(`Entry saved: ${data.bets.map((bet: Bet) => bet.number).join(", ")}`);
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
        <div className="rounded-xl border border-white/10 bg-panel/80 p-5 sm:p-7">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-neon">{status.game.durationMinutes || 5} min 1-12 game</p>
          <h1 className="mt-3 text-4xl font-black text-white sm:text-6xl">Pick numbers.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/65">
            One game only. Numbers 1 to 12. Choose one number or repeat same number multiple times before result.
          </p>
          <div className="mt-5 grid max-w-xl gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-white/10 bg-ink/75 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">Round</p>
              <p className="mt-2 font-mono text-lg font-black text-white">{status.roundId}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-ink/75 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">Next result</p>
              <Countdown target={status.nextDrawTime} />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
          {user ? (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">Logged in</p>
                  <h2 className="mt-1 text-2xl font-black">{user.username}</h2>
                  <p className="text-sm text-white/55">{user.role.replace("_", " ")}</p>
                </div>
                <button className="rounded-lg border border-white/10 px-4 py-2 text-sm font-black" onClick={logout} type="button">
                  Logout
                </button>
              </div>
              {canSeeOwnPoints && (
                <>
                  <div className="rounded-lg border border-neon/25 bg-neon/10 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-neon">Point balance</p>
                    <p className="mt-1 font-mono text-3xl font-black text-white">{user.points ?? 0}</p>
                  </div>
                  <p className="text-sm text-white/55">Cost now: {selected.length * 10} points</p>
                </>
              )}
            </div>
          ) : (
            <form className="space-y-3" onSubmit={login}>
              <h2 className="text-2xl font-black">User Login</h2>
              <input
                className="w-full rounded-lg border border-white/10 bg-ink px-3 py-3 text-white outline-none ring-neon/40 focus:ring-2"
                placeholder="Username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
              />
              <input
                className="w-full rounded-lg border border-white/10 bg-ink px-3 py-3 text-white outline-none ring-neon/40 focus:ring-2"
                placeholder="Password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <button className="w-full rounded-lg bg-neon px-4 py-3 font-black text-ink disabled:opacity-60" disabled={loading}>
                Login
              </button>
            </form>
          )}
          {message && <p className="mt-3 text-sm text-gold">{message}</p>}
        </div>
      </section>

      <section className="rounded-xl border border-white/10 bg-panel/80 p-5">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {Array.from({ length: 12 }, (_, index) => index + 1).map((number) => {
            const count = selectedCounts[number] || 0;
            return (
              <div
                key={number}
                className={`relative aspect-square rounded-lg border p-3 transition ${
                  count
                    ? "border-neon bg-neon text-ink"
                    : "border-white/10 bg-ink/75 text-white hover:border-neon/60 disabled:opacity-50"
                }`}
              >
                <button
                  type="button"
                  onClick={() => addNumber(number)}
                  disabled={!user || !gameRunning || entryLocked}
                  className="flex h-full w-full flex-col items-start justify-center text-left disabled:opacity-50"
                >
                  <span className="block font-mono text-3xl font-black">{number}</span>
                  {canSeeBoardPoints && (
                    <span className="mt-2 block text-xs font-bold">{status.numberTotals[String(number)] || 0} pts</span>
                  )}
                  {count > 0 && <span className="mt-3 rounded-md bg-ink/20 px-2 py-1 text-xs font-black">x{count}</span>}
                </button>
                {count > 0 && (
                  <button
                    type="button"
                    onClick={() => removeNumber(number)}
                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-md border border-ink/20 bg-white/20 font-black"
                    aria-label={`Remove one ${number}`}
                  >
                    -
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-white/58">
            {!gameRunning
              ? "Game stopped"
              : entryLocked
                ? "Entry closed for last 30 seconds"
                : `Selected: ${
                    selected.length
                      ? Object.entries(selectedCounts)
                          .map(([number, count]) => `${number}${count > 1 ? ` x${count}` : ""}`)
                          .join(", ")
                      : "none"
                  }`}
          </p>
          <button
            className="rounded-lg bg-hot px-5 py-3 font-black text-white disabled:opacity-50"
            disabled={!user || !selected.length || loading || !gameRunning || entryLocked}
            onClick={submitBets}
            type="button"
          >
            Submit
          </button>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
          <h2 className="text-xl font-black">My Current Numbers</h2>
          <div className="mt-3 grid gap-2">
            {status.myBets.length ? (
              status.myBets.map((bet) => (
                <div key={bet.id} className="flex justify-between rounded-lg border border-white/10 bg-ink/70 p-3 text-sm">
                  <span>Number {bet.number}</span>
                  {canSeeBoardPoints && <span className="font-mono">{bet.points} pts</span>}
                </div>
              ))
            ) : (
              <p className="text-sm text-white/55">No number in current round.</p>
            )}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
          <h2 className="text-xl font-black">Recent Results</h2>
          <div className="mt-3 grid gap-2">
            {status.recent.slice(0, 6).map((result) => (
              <div key={result.id} className="flex justify-between rounded-lg border border-white/10 bg-ink/70 p-3 text-sm">
                <span>{result.drawNumber}</span>
                <span className="font-mono text-gold">Winner #{result.winningNumber}</span>
              </div>
            ))}
            {!status.recent.length && <p className="text-sm text-white/55">No result yet.</p>}
          </div>
        </div>
      </section>
    </div>
  );
}
