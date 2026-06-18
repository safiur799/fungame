"use client";

import { useCallback, useEffect, useState } from "react";
import { ResultTable } from "./ResultTable";
import type { Game, PaginatedResults, Result } from "@/types/result";

type GamesResponse = {
  games: Game[];
};

const DEFAULT_GAME_ID = "main";
type ResultMode = "random" | "manual";
type PublishDraft = {
  drawDate: string;
  drawClockTime: string;
  resultMode: ResultMode;
  winningNumber: string;
};

const EMPTY_PUBLISH_DRAFT: PublishDraft = {
  drawDate: "",
  drawClockTime: "",
  resultMode: "random",
  winningNumber: ""
};

function todayDateInputValue() {
  const date = new Date();
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function toDatetimeLocal(value: string) {
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function AdminPanel({ isAdmin }: { isAdmin: boolean }) {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(isAdmin);
  const [message, setMessage] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGameId, setSelectedGameId] = useState("main");
  const [gameName, setGameName] = useState("Fast 100");
  const [gameMin, setGameMin] = useState("1");
  const [gameMax, setGameMax] = useState("100");
  const [gameTimes, setGameTimes] = useState<string[]>(["10:00"]);
  const [newGameTime, setNewGameTime] = useState("");
  const [publishDrafts, setPublishDrafts] = useState<Record<string, PublishDraft>>({});
  const [editingResult, setEditingResult] = useState<Result | null>(null);
  const [editDrawTime, setEditDrawTime] = useState("");
  const [editWinningNumber, setEditWinningNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const activeGames = games.filter((game) => game.active);
  const isDefaultGameSelected = selectedGameId === DEFAULT_GAME_ID;

  const loadResults = useCallback(async () => {
    const response = await fetch(`/api/admin/results?gameId=${encodeURIComponent(selectedGameId)}`, { cache: "no-store" });
    if (response.ok) {
      const data = (await response.json()) as PaginatedResults;
      setResults(data.items);
    }
  }, [selectedGameId]);

  const loadGames = useCallback(async () => {
    const response = await fetch("/api/admin/games", { cache: "no-store" });
    if (response.ok) {
      const data = (await response.json()) as GamesResponse;
      setGames(data.games);
      const active = data.games.filter((game) => game.active);
      if (!active.some((game) => game.id === selectedGameId) && active[0] && selectedGameId !== "new") {
        setSelectedGameId(active[0].id);
      }
    }
  }, [selectedGameId]);

  useEffect(() => {
    if (authed) {
      void loadResults();
      void loadGames();
    }
  }, [authed, loadGames, loadResults]);

  useEffect(() => {
    const selected = games.find((game) => game.id === selectedGameId);
    if (selected) {
      setGameName(selected.name);
      setGameMin(String(selected.minNumber));
      setGameMax(String(selected.maxNumber));
      setGameTimes(selected.drawTimes);
    }
  }, [games, selectedGameId]);

  async function login(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password })
    });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      setMessage(data.error || "Unable to sign in");
      return;
    }
    setAuthed(true);
    setPassword("");
  }

  function getPublishDraft(game: Game) {
    const draft = publishDrafts[game.id] || EMPTY_PUBLISH_DRAFT;
    return {
      ...draft,
      drawDate: draft.drawDate || todayDateInputValue(),
      drawClockTime: draft.drawClockTime || game.drawTimes[0] || ""
    };
  }

  function updatePublishDraft(gameId: string, patch: Partial<PublishDraft>) {
    setPublishDrafts((current) => ({
      ...current,
      [gameId]: {
        ...(current[gameId] || EMPTY_PUBLISH_DRAFT),
        ...patch
      }
    }));
  }

  async function publishResult(event: React.FormEvent, game: Game) {
    event.preventDefault();
    const draft = getPublishDraft(game);
    setLoading(true);
    setMessage("");
    const isoDrawTime = new Date(`${draft.drawDate}T${draft.drawClockTime}`).toISOString();
    const response = await fetch("/api/admin/results", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        gameId: game.id,
        drawTime: isoDrawTime,
        winningNumber: draft.resultMode === "manual" ? draft.winningNumber : ""
      })
    });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      setMessage(data.error || "Unable to publish result");
      return;
    }
    setMessage(`Published ${game.name} draw ${data.drawNumber}`);
    updatePublishDraft(game.id, EMPTY_PUBLISH_DRAFT);
    if (selectedGameId === game.id) await loadResults();
  }

  function addGameTime() {
    if (!newGameTime) return;
    setGameTimes((current) => Array.from(new Set([...current, newGameTime])).sort());
    setNewGameTime("");
  }

  function addQuickGameTime(minutesFromNow: number) {
    const date = new Date(Date.now() + minutesFromNow * 60_000);
    const time = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
    setGameTimes((current) => Array.from(new Set([...current, time])).sort());
  }

  function removeGameTime(time: string) {
    setGameTimes((current) => current.filter((item) => item !== time));
  }

  async function saveGame() {
    setLoading(true);
    setMessage("");
    const response = await fetch("/api/admin/games", {
      method: selectedGameId === "new" ? "POST" : "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...(selectedGameId === "new" ? {} : { id: selectedGameId }),
        name: gameName,
        minNumber: Number(gameMin),
        maxNumber: Number(gameMax),
        drawTimes: gameTimes,
        active: true
      })
    });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      setMessage(data.error || "Unable to save game");
      return;
    }
    setMessage(selectedGameId === "new" ? "Game created" : "Game updated");
    setSelectedGameId(data.id);
    await loadGames();
    await loadResults();
  }

  function startNewGame() {
    setSelectedGameId("new");
    setGameName("Fast 100");
    setGameMin("1");
    setGameMax("100");
    setGameTimes(["10:00"]);
    setResults([]);
    setMessage("");
  }

  async function removeGameById(gameId: string, name: string) {
    if (gameId === DEFAULT_GAME_ID || gameId === "new") return;
    if (!window.confirm(`Remove ${name} from active game rooms?`)) return;
    setLoading(true);
    setMessage("");
    const response = await fetch(`/api/admin/games?id=${encodeURIComponent(gameId)}`, { method: "DELETE" });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      setMessage(data.error || "Unable to remove game");
      return;
    }
    setMessage("Game removed");
    setSelectedGameId(DEFAULT_GAME_ID);
    await loadGames();
    await loadResults();
  }

  async function removeSelectedGame() {
    await removeGameById(selectedGameId, gameName);
  }

  function startEdit(result: Result) {
    setEditingResult(result);
    setEditDrawTime(toDatetimeLocal(result.drawTime));
    setEditWinningNumber(result.winningNumber);
    setMessage("");
  }

  async function updateResult(event: React.FormEvent) {
    event.preventDefault();
    if (!editingResult) return;
    setLoading(true);
    setMessage("");
    const response = await fetch("/api/admin/results", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: editingResult.id,
        gameId: editingResult.gameId,
        drawTime: new Date(editDrawTime).toISOString(),
        winningNumber: editWinningNumber
      })
    });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      setMessage(data.error || "Unable to update result");
      return;
    }
    setMessage(`Updated draw ${data.drawNumber}`);
    setEditingResult(null);
    setEditDrawTime("");
    setEditWinningNumber("");
    await loadResults();
  }

  async function deleteResult(id: string) {
    if (!window.confirm("Delete this result permanently?")) return;
    const response = await fetch(`/api/admin/results?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error || "Unable to delete result");
      return;
    }
    setMessage("Result deleted");
    await loadResults();
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setAuthed(false);
    setResults([]);
  }

  if (!authed) {
    return (
      <form onSubmit={login} className="mx-auto max-w-md rounded-xl border border-white/10 bg-panel/80 p-5 shadow-glow">
        <h1 className="text-2xl font-black text-white">Admin Access</h1>
        <p className="mt-2 text-sm text-white/60">Enter the environment password to manage draw results.</p>
        <label className="mt-5 block text-sm font-bold text-white/70" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          className="mt-2 w-full rounded-lg border border-white/10 bg-ink px-3 py-3 text-white outline-none ring-neon/40 focus:ring-2"
          required
        />
        {message && <p className="mt-3 text-sm text-red-200">{message}</p>}
        <button
          disabled={loading}
          className="mt-5 w-full rounded-lg bg-neon px-4 py-3 font-black text-ink hover:brightness-110 disabled:opacity-60"
          type="submit"
        >
          {loading ? "Checking..." : "Unlock Admin"}
        </button>
      </form>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-black text-white">Admin Panel</h1>
          <p className="mt-1 text-sm text-white/60">Create, publish, delete, and export draw results.</p>
        </div>
        <div className="flex gap-2">
          <a
            className="rounded-lg border border-gold/30 px-4 py-3 text-sm font-black text-gold hover:bg-gold/10"
            href="/api/admin/export"
          >
            Export CSV
          </a>
          <button className="rounded-lg border border-white/10 px-4 py-3 text-sm font-black" onClick={logout} type="button">
            Logout
          </button>
        </div>
      </div>

      <section className="rounded-xl border border-neon/20 bg-panel/80 p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-black">Game Manager</h2>
            <p className="mt-1 text-sm text-white/60">Default 1-1000 stays fixed. Add separate rooms with their own ranges and result times.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={startNewGame}
              className="rounded-lg bg-neon px-4 py-3 text-sm font-black text-ink hover:brightness-110"
            >
              New Room
            </button>
            <button
              type="button"
              onClick={removeSelectedGame}
              disabled={loading || selectedGameId === DEFAULT_GAME_ID || selectedGameId === "new"}
              className="rounded-lg border border-red-400/30 px-4 py-3 text-sm font-black text-red-200 hover:bg-red-500/10 disabled:opacity-40"
            >
              Remove Selected
            </button>
          </div>
        </div>

        <div className="mt-5">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-white/45">Active Rooms</p>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {activeGames.map((game) => (
              <div key={game.id} className="rounded-lg border border-white/10 bg-ink/70 p-4">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <h3 className="font-black text-white">
                      {game.name}
                      {game.id === DEFAULT_GAME_ID && (
                        <span className="ml-2 rounded border border-gold/25 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-gold">
                          Fixed
                        </span>
                      )}
                    </h3>
                    <p className="mt-1 text-sm text-white/55">
                      Range {game.minNumber} to {game.maxNumber} · Times {game.drawTimes.join(", ")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedGameId(game.id)}
                      className="rounded-md border border-neon/30 px-3 py-2 text-xs font-black text-neon hover:bg-neon/10"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => removeGameById(game.id, game.name)}
                      disabled={loading || game.id === DEFAULT_GAME_ID}
                      className="rounded-md border border-red-400/30 px-3 py-2 text-xs font-black text-red-200 hover:bg-red-500/10 disabled:opacity-40"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[260px_1fr]">
          <label className="block">
            <span className="text-sm font-bold text-white/70">Select room to edit or publish</span>
            <select
              value={selectedGameId}
              onChange={(event) => setSelectedGameId(event.target.value)}
              className="mt-2 w-full rounded-lg border border-white/10 bg-ink px-3 py-3 text-white outline-none ring-neon/40 focus:ring-2"
            >
              {activeGames.map((game) => (
                <option key={game.id} value={game.id}>
                  {game.name} ({game.minNumber}-{game.maxNumber})
                </option>
              ))}
              {selectedGameId === "new" && <option value="new">New room</option>}
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="text-sm font-bold text-white/70">Game name</span>
              <input
                value={gameName}
                onChange={(event) => setGameName(event.target.value)}
                disabled={isDefaultGameSelected}
                className="mt-2 w-full rounded-lg border border-white/10 bg-ink px-3 py-3 text-white outline-none ring-neon/40 focus:ring-2"
              />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-white/70">Min number</span>
              <input
                value={gameMin}
                onChange={(event) => setGameMin(event.target.value.replace(/\D/g, ""))}
                inputMode="numeric"
                disabled={isDefaultGameSelected}
                className="mt-2 w-full rounded-lg border border-white/10 bg-ink px-3 py-3 font-mono text-white outline-none ring-neon/40 focus:ring-2"
              />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-white/70">Max number</span>
              <input
                value={gameMax}
                onChange={(event) => setGameMax(event.target.value.replace(/\D/g, ""))}
                inputMode="numeric"
                disabled={isDefaultGameSelected}
                className="mt-2 w-full rounded-lg border border-white/10 bg-ink px-3 py-3 font-mono text-white outline-none ring-neon/40 focus:ring-2"
              />
            </label>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {gameTimes.map((time) => (
            <span
              key={time}
              className="inline-flex items-center gap-2 rounded-md border border-neon/25 bg-neon/10 px-3 py-2 font-mono text-sm font-black text-neon"
            >
              {time}
              <button
                type="button"
                className="text-white/70 hover:text-white"
                onClick={() => removeGameTime(time)}
                disabled={isDefaultGameSelected}
                aria-label={`Remove ${time}`}
              >
                x
              </button>
            </span>
          ))}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-[180px_auto_auto] sm:items-end">
          <label className="block">
            <span className="text-sm font-bold text-white/70">Add result time</span>
            <input
              value={newGameTime}
              onChange={(event) => setNewGameTime(event.target.value)}
              type="time"
              disabled={isDefaultGameSelected}
              className="mt-2 w-full rounded-lg border border-white/10 bg-ink px-3 py-3 text-white outline-none ring-neon/40 focus:ring-2"
            />
          </label>
          <button
            type="button"
            onClick={addGameTime}
            disabled={isDefaultGameSelected}
            className="rounded-lg border border-neon/30 px-5 py-3 font-black text-neon hover:bg-neon/10"
          >
            Add Time
          </button>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => addQuickGameTime(5)}
              disabled={isDefaultGameSelected}
              className="rounded-lg border border-white/10 px-4 py-3 text-sm font-black text-white/80 hover:bg-white/10"
            >
              +5 Min
            </button>
            <button
              type="button"
              onClick={() => addQuickGameTime(15)}
              disabled={isDefaultGameSelected}
              className="rounded-lg border border-white/10 px-4 py-3 text-sm font-black text-white/80 hover:bg-white/10"
            >
              +15 Min
            </button>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            disabled={loading || gameTimes.length === 0 || isDefaultGameSelected}
            onClick={saveGame}
            className="rounded-lg bg-hot px-5 py-3 font-black text-white hover:brightness-110 disabled:opacity-60"
          >
            {selectedGameId === "new" ? "Create Room" : "Save Room"}
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-white/10 bg-panel/80 p-5">
        <h2 className="text-xl font-black">Publish Result For Each Game</h2>
        <p className="mt-1 text-sm text-white/60">Each active game has its own draw time, random result, or manual winning number.</p>
        <div className="mt-4 grid gap-4">
          {activeGames.map((game) => {
            const draft = getPublishDraft(game);
            return (
              <form
                key={game.id}
                onSubmit={(event) => publishResult(event, game)}
                className="rounded-lg border border-white/10 bg-ink/75 p-4"
              >
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                  <div>
                    <h3 className="font-black text-white">{game.name}</h3>
                    <p className="mt-1 text-sm text-white/55">
                      Range {game.minNumber} to {game.maxNumber} · Times {game.drawTimes.join(", ")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedGameId(game.id)}
                    className="rounded-md border border-neon/30 px-3 py-2 text-xs font-black text-neon hover:bg-neon/10"
                  >
                    View History
                  </button>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-[1fr_160px_220px_180px_auto] md:items-end">
                  <label className="block">
                    <span className="text-sm font-bold text-white/70">Draw date</span>
                    <input
                      value={draft.drawDate}
                      onChange={(event) => updatePublishDraft(game.id, { drawDate: event.target.value })}
                      type="date"
                      required
                      className="mt-2 w-full rounded-lg border border-white/10 bg-ink px-3 py-3 text-white outline-none ring-neon/40 focus:ring-2"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-bold text-white/70">Result time</span>
                    <select
                      value={draft.drawClockTime}
                      onChange={(event) => updatePublishDraft(game.id, { drawClockTime: event.target.value })}
                      required
                      className="mt-2 w-full rounded-lg border border-white/10 bg-ink px-3 py-3 text-white outline-none ring-neon/40 focus:ring-2"
                    >
                      {game.drawTimes.map((time) => (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-sm font-bold text-white/70">Result type</span>
                    <select
                      value={draft.resultMode}
                      onChange={(event) => updatePublishDraft(game.id, { resultMode: event.target.value as ResultMode })}
                      className="mt-2 w-full rounded-lg border border-white/10 bg-ink px-3 py-3 text-white outline-none ring-neon/40 focus:ring-2"
                    >
                      <option value="random">Random number</option>
                      <option value="manual">Manual winning number</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-sm font-bold text-white/70">Winning number</span>
                    <input
                      value={draft.winningNumber}
                      onChange={(event) =>
                        updatePublishDraft(game.id, { winningNumber: event.target.value.replace(/\D/g, "").slice(0, 8) })
                      }
                      inputMode="numeric"
                      placeholder={draft.resultMode === "manual" ? `${game.minNumber}-${game.maxNumber}` : "Random"}
                      pattern={draft.resultMode === "manual" ? "\\d{1,8}" : undefined}
                      required={draft.resultMode === "manual"}
                      disabled={draft.resultMode === "random"}
                      className="mt-2 w-full rounded-lg border border-white/10 bg-ink px-3 py-3 font-mono text-white outline-none ring-neon/40 focus:ring-2"
                    />
                  </label>
                  <button
                    disabled={loading}
                    className="rounded-lg bg-hot px-5 py-3 font-black text-white shadow-hot hover:brightness-110 disabled:opacity-60"
                    type="submit"
                  >
                    Publish
                  </button>
                </div>
              </form>
            );
          })}
        </div>
        {message && <p className="mt-4 text-sm text-gold">{message}</p>}
      </section>

      {editingResult && (
        <form onSubmit={updateResult} className="rounded-xl border border-gold/20 bg-gold/10 p-5">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-black text-white">Edit Result</h2>
              <p className="mt-1 text-sm text-gold/80">Change the published time or winning number.</p>
            </div>
            <button
              type="button"
              onClick={() => setEditingResult(null)}
              className="rounded-lg border border-white/10 px-4 py-2 text-sm font-bold text-white/80"
            >
              Cancel
            </button>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-[1fr_180px_auto] md:items-end">
            <label className="block">
              <span className="text-sm font-bold text-white/70">Draw time</span>
              <input
                value={editDrawTime}
                onChange={(event) => setEditDrawTime(event.target.value)}
                type="datetime-local"
                required
                className="mt-2 w-full rounded-lg border border-white/10 bg-ink px-3 py-3 text-white outline-none ring-neon/40 focus:ring-2"
              />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-white/70">Winning number</span>
              <input
                value={editWinningNumber}
                onChange={(event) => setEditWinningNumber(event.target.value.replace(/\D/g, "").slice(0, 8))}
                inputMode="numeric"
                pattern="\d{1,8}"
                className="mt-2 w-full rounded-lg border border-white/10 bg-ink px-3 py-3 font-mono text-white outline-none ring-neon/40 focus:ring-2"
              />
            </label>
            <button
              disabled={loading}
              className="rounded-lg bg-gold px-5 py-3 font-black text-ink hover:brightness-110 disabled:opacity-60"
              type="submit"
            >
              Save Result
            </button>
          </div>
        </form>
      )}

      <section className="space-y-3">
        <h2 className="text-xl font-black">Draw History</h2>
        <ResultTable results={results} showActions onEdit={startEdit} onDelete={deleteResult} />
      </section>
    </div>
  );
}
