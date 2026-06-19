"use client";

import { useMemo, useState } from "react";

type Mode = "lucky-seat" | "elimination" | "team-battle" | "bingo-lite";

type Player = {
  number: number;
  label: string;
};

type BattleRound = {
  round: number;
  player: Player;
  team: number;
  points: number;
};

const PRESETS = [5, 10, 15, 50, 100, 500];

const MODES: Array<{ id: Mode; title: string; detail: string }> = [
  { id: "lucky-seat", title: "Lucky Seat Draw", detail: "Draw one lucky seat from the room." },
  { id: "elimination", title: "Elimination", detail: "Remove numbers until one remains." },
  { id: "team-battle", title: "Team Battle", detail: "Random players score points for teams." },
  { id: "bingo-lite", title: "Bingo Lite", detail: "Host calls numbers and players use cards." }
];

function makePlayers(count: number, namesText: string) {
  const names = namesText
    .split(/\r?\n/)
    .map((name) => name.trim())
    .filter(Boolean);

  return Array.from({ length: count }, (_, index) => {
    const number = index + 1;
    return {
      number,
      label: names[index] || `Player ${number}`
    };
  });
}

function pickRandom<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function seededRandom(seed: number) {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function makeBingoCard(playerNumber: number) {
  const random = seededRandom(playerNumber * 9973);
  const numbers = Array.from({ length: 75 }, (_, index) => index + 1);

  for (let index = numbers.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [numbers[index], numbers[swapIndex]] = [numbers[swapIndex], numbers[index]];
  }

  return Array.from({ length: 25 }, (_, index) => (index === 12 ? 0 : numbers[index]));
}

function getBingoWin(card: number[], calledNumbers: number[]) {
  const called = new Set(calledNumbers);
  const isMarked = (index: number) => card[index] === 0 || called.has(card[index]);
  const lines = [
    { type: "Row 1", indexes: [0, 1, 2, 3, 4] },
    { type: "Row 2", indexes: [5, 6, 7, 8, 9] },
    { type: "Row 3", indexes: [10, 11, 12, 13, 14] },
    { type: "Row 4", indexes: [15, 16, 17, 18, 19] },
    { type: "Row 5", indexes: [20, 21, 22, 23, 24] },
    { type: "Column 1", indexes: [0, 5, 10, 15, 20] },
    { type: "Column 2", indexes: [1, 6, 11, 16, 21] },
    { type: "Column 3", indexes: [2, 7, 12, 17, 22] },
    { type: "Column 4", indexes: [3, 8, 13, 18, 23] },
    { type: "Column 5", indexes: [4, 9, 14, 19, 24] },
    { type: "Diagonal", indexes: [0, 6, 12, 18, 24] },
    { type: "Diagonal", indexes: [4, 8, 12, 16, 20] }
  ];
  const winningLine = lines.find((line) => line.indexes.every(isMarked));
  const fullCard = card.every((number) => number === 0 || called.has(number));

  if (fullCard) {
    return { type: "Full card", indexes: card.map((_, index) => index) };
  }

  return winningLine || null;
}

function NumberPill({ children, active = false }: { children: React.ReactNode; active?: boolean }) {
  return (
    <span
      className={`rounded-md border px-2.5 py-1.5 font-mono text-sm font-black ${
        active ? "border-neon/35 bg-neon/15 text-neon" : "border-white/10 bg-white/[0.03] text-white/65"
      }`}
    >
      {children}
    </span>
  );
}

export function OfflinePartyGame() {
  const [mode, setMode] = useState<Mode>("lucky-seat");
  const [playerCount, setPlayerCount] = useState(50);
  const [namesText, setNamesText] = useState("");

  const [luckySeat, setLuckySeat] = useState<Player | null>(null);
  const [luckyHistory, setLuckyHistory] = useState<Player[]>([]);

  const [eliminationPool, setEliminationPool] = useState<number[]>([]);
  const [eliminated, setEliminated] = useState<Player[]>([]);
  const [champion, setChampion] = useState<Player | null>(null);

  const [teamCount, setTeamCount] = useState(4);
  const [targetScore, setTargetScore] = useState(10);
  const [teamScores, setTeamScores] = useState([0, 0, 0, 0]);
  const [battleHistory, setBattleHistory] = useState<BattleRound[]>([]);

  const [calledNumbers, setCalledNumbers] = useState<number[]>([]);
  const [cardPlayer, setCardPlayer] = useState(1);

  const players = useMemo(() => makePlayers(playerCount, namesText), [namesText, playerCount]);
  const modeMeta = MODES.find((item) => item.id === mode) || MODES[0];
  const activeElimination = eliminationPool.map((number) => players[number - 1]).filter(Boolean);
  const teamWinnerIndex = teamScores.findIndex((score) => score >= targetScore);
  const bingoCard = useMemo(() => makeBingoCard(cardPlayer), [cardPlayer]);
  const bingoWin = useMemo(() => getBingoWin(bingoCard, calledNumbers), [bingoCard, calledNumbers]);
  const bingoWinner = players[cardPlayer - 1];

  function updatePlayerCount(value: number) {
    const nextCount = Math.min(500, Math.max(5, value));
    setPlayerCount(nextCount);
    setCardPlayer((number) => Math.min(number, nextCount));
    resetGames();
  }

  function resetGames() {
    setLuckySeat(null);
    setLuckyHistory([]);
    setEliminationPool([]);
    setEliminated([]);
    setChampion(null);
    setTeamScores(Array.from({ length: teamCount }, () => 0));
    setBattleHistory([]);
    setCalledNumbers([]);
  }

  function selectMode(nextMode: Mode) {
    setMode(nextMode);
  }

  function drawLuckySeat() {
    const winner = pickRandom(players);
    setLuckySeat(winner);
    setLuckyHistory((items) => [winner, ...items].slice(0, 20));
  }

  function startElimination() {
    setEliminationPool(players.map((player) => player.number));
    setEliminated([]);
    setChampion(null);
  }

  function eliminateRound() {
    const pool = eliminationPool.length ? [...eliminationPool] : players.map((player) => player.number);
    if (pool.length <= 1) return;

    const removeCount = Math.min(pool.length - 1, Math.max(1, Math.ceil(pool.length * 0.16)));
    const removed: Player[] = [];

    for (let index = 0; index < removeCount; index += 1) {
      const removeIndex = Math.floor(Math.random() * pool.length);
      const [number] = pool.splice(removeIndex, 1);
      removed.push(players[number - 1]);
    }

    setEliminationPool(pool);
    setEliminated((items) => [...removed, ...items]);
    setChampion(pool.length === 1 ? players[pool[0] - 1] : null);
  }

  function updateTeamCount(value: number) {
    const nextCount = Math.min(8, Math.max(2, value));
    setTeamCount(nextCount);
    setTeamScores(Array.from({ length: nextCount }, () => 0));
    setBattleHistory([]);
  }

  function drawTeamPoint() {
    const player = pickRandom(players);
    const team = ((player.number - 1) % teamCount) + 1;
    const points = Math.floor(Math.random() * 3) + 1;
    setTeamScores((scores) => scores.map((score, index) => (index === team - 1 ? score + points : score)));
    setBattleHistory((items) => [{ round: items.length + 1, player, team, points }, ...items].slice(0, 30));
  }

  function resetTeamBattle() {
    setTeamScores(Array.from({ length: teamCount }, () => 0));
    setBattleHistory([]);
  }

  function callBingoNumber() {
    if (calledNumbers.length >= 75) return;
    const remaining = Array.from({ length: 75 }, (_, index) => index + 1).filter((number) => !calledNumbers.includes(number));
    setCalledNumbers((items) => [pickRandom(remaining), ...items]);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-white/10 bg-white/[0.04] p-5 sm:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-neon">Offline group games</p>
            <h1 className="mt-2 text-3xl font-black text-white sm:text-5xl">{modeMeta.title}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/62">{modeMeta.detail}</p>
          </div>
          <div className="rounded-lg border border-gold/20 bg-gold/10 px-4 py-3">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-gold">Players</p>
            <p className="mt-1 font-mono text-3xl font-black text-white">{playerCount}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {MODES.map((item) => (
          <button
            className={`rounded-lg border p-3 text-left ${
              mode === item.id
                ? "border-neon/45 bg-neon/15 text-white"
                : "border-white/10 bg-panel/70 text-white/70 hover:bg-white/[0.06]"
            }`}
            key={item.id}
            onClick={() => selectMode(item.id)}
            type="button"
          >
            <span className="block text-sm font-black">{item.title}</span>
            <span className="mt-1 block text-xs leading-5 text-white/45">{item.detail}</span>
          </button>
        ))}
      </section>

      <section className="grid gap-5 lg:grid-cols-[.85fr_1.15fr]">
        <div className="space-y-4 rounded-xl border border-white/10 bg-panel/75 p-5">
          <div>
            <label className="text-sm font-black text-white" htmlFor="player-count">
              Group size
            </label>
            <input
              className="mt-2 w-full rounded-lg border border-white/10 bg-ink px-3 py-3 font-mono text-xl font-black text-white outline-none ring-neon/40 focus:ring-2"
              id="player-count"
              inputMode="numeric"
              max={500}
              min={5}
              onChange={(event) => updatePlayerCount(Number(event.target.value) || 5)}
              type="number"
              value={playerCount}
            />
            <div className="mt-3 grid grid-cols-3 gap-2">
              {PRESETS.map((count) => (
                <button
                  className={`rounded-md border px-3 py-2 text-sm font-black ${
                    count === playerCount
                      ? "border-neon/40 bg-neon/15 text-neon"
                      : "border-white/10 text-white/70 hover:bg-white/10"
                  }`}
                  key={count}
                  onClick={() => updatePlayerCount(count)}
                  type="button"
                >
                  {count}
                </button>
              ))}
            </div>
          </div>

          {mode === "team-battle" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-black text-white">Teams</span>
                <input
                  className="mt-2 w-full rounded-lg border border-white/10 bg-ink px-3 py-3 font-mono text-xl font-black text-white outline-none ring-neon/40 focus:ring-2"
                  max={8}
                  min={2}
                  onChange={(event) => updateTeamCount(Number(event.target.value) || 2)}
                  type="number"
                  value={teamCount}
                />
              </label>
              <label className="block">
                <span className="text-sm font-black text-white">Target score</span>
                <input
                  className="mt-2 w-full rounded-lg border border-white/10 bg-ink px-3 py-3 font-mono text-xl font-black text-white outline-none ring-neon/40 focus:ring-2"
                  min={3}
                  onChange={(event) => setTargetScore(Math.max(3, Number(event.target.value) || 3))}
                  type="number"
                  value={targetScore}
                />
              </label>
            </div>
          )}

          {mode === "bingo-lite" && (
            <label className="block">
              <span className="text-sm font-black text-white">Preview card number</span>
              <input
                className="mt-2 w-full rounded-lg border border-white/10 bg-ink px-3 py-3 font-mono text-xl font-black text-white outline-none ring-neon/40 focus:ring-2"
                max={playerCount}
                min={1}
                onChange={(event) => setCardPlayer(Math.min(playerCount, Math.max(1, Number(event.target.value) || 1)))}
                type="number"
                value={cardPlayer}
              />
            </label>
          )}

          <div>
            <label className="text-sm font-black text-white" htmlFor="player-names">
              Optional player names
            </label>
            <textarea
              className="mt-2 min-h-32 w-full rounded-lg border border-white/10 bg-ink px-3 py-3 text-sm text-white outline-none ring-neon/40 placeholder:text-white/28 focus:ring-2"
              id="player-names"
              onChange={(event) => setNamesText(event.target.value)}
              placeholder="One name per line. Empty lines use Player 1, Player 2..."
              value={namesText}
            />
          </div>

          <button
            className="w-full rounded-md border border-white/10 px-4 py-2 text-sm font-bold text-white/70 hover:bg-white/10"
            onClick={resetGames}
            type="button"
          >
            Reset Current Games
          </button>
        </div>

        <div className="rounded-xl border border-neon/20 bg-panel/80 p-5 shadow-glow">
          {mode === "lucky-seat" && (
            <div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-neon">Lucky Seat Draw</p>
                  <h2 className="mt-1 text-2xl font-black text-white">Pick one seat</h2>
                </div>
                <button className="rounded-lg bg-neon px-5 py-3 font-black text-ink hover:brightness-110" onClick={drawLuckySeat} type="button">
                  Draw Seat
                </button>
              </div>
              <div className="mt-5 rounded-lg border border-white/10 bg-ink/70 p-6 text-center">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-white/45">Lucky seat</p>
                <p className="mt-3 font-mono text-7xl font-black text-gold">{luckySeat?.number || "--"}</p>
                <p className="mt-2 text-lg font-black text-white">{luckySeat?.label || "Waiting for draw"}</p>
              </div>
              <HistoryList title="Recent lucky seats" items={luckyHistory.map((player) => `${player.number} - ${player.label}`)} />
            </div>
          )}

          {mode === "elimination" && (
            <div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-neon">Elimination Number Game</p>
                  <h2 className="mt-1 text-2xl font-black text-white">Last number wins</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="rounded-lg border border-white/10 px-4 py-3 font-black text-white/75 hover:bg-white/10" onClick={startElimination} type="button">
                    Start
                  </button>
                  <button
                    className="rounded-lg bg-neon px-5 py-3 font-black text-ink hover:brightness-110 disabled:opacity-45"
                    disabled={!!champion}
                    onClick={eliminateRound}
                    type="button"
                  >
                    Eliminate Round
                  </button>
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <Stat label="Remaining" value={activeElimination.length || playerCount} tone="neon" />
                <Stat label="Eliminated" value={eliminated.length} tone="gold" />
                <Stat label="Winner" value={champion?.number || "--"} tone="hot" />
              </div>
              <div className="mt-5 rounded-lg border border-white/10 bg-ink/70 p-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-white/45">Remaining numbers</p>
                <div className="mt-3 flex max-h-44 flex-wrap gap-1.5 overflow-auto">
                  {(activeElimination.length ? activeElimination : players).slice(0, 500).map((player) => (
                    <NumberPill key={player.number} active={champion?.number === player.number}>
                      {player.number}
                    </NumberPill>
                  ))}
                </div>
              </div>
            </div>
          )}

          {mode === "team-battle" && (
            <div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-neon">Team Battle Draw</p>
                  <h2 className="mt-1 text-2xl font-black text-white">Draw points for teams</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="rounded-lg bg-neon px-5 py-3 font-black text-ink hover:brightness-110" onClick={drawTeamPoint} type="button">
                    Draw Point
                  </button>
                  <button className="rounded-lg border border-white/10 px-4 py-3 font-black text-white/75 hover:bg-white/10" onClick={resetTeamBattle} type="button">
                    Reset
                  </button>
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {teamScores.map((score, index) => (
                  <div className="rounded-lg border border-white/10 bg-ink/75 p-4" key={index}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-black text-white">Team {index + 1}</p>
                      {teamWinnerIndex === index && <span className="rounded bg-gold px-2 py-1 text-xs font-black text-ink">Winner</span>}
                    </div>
                    <p className="mt-2 font-mono text-4xl font-black text-neon">{score}</p>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full bg-neon" style={{ width: `${Math.min(100, (score / targetScore) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <HistoryList
                title="Point history"
                items={battleHistory.map((item) => `Round ${item.round}: Team ${item.team} +${item.points} (${item.player.label})`)}
              />
            </div>
          )}

          {mode === "bingo-lite" && (
            <div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-neon">Bingo Lite</p>
                  <h2 className="mt-1 text-2xl font-black text-white">Call numbers</h2>
                </div>
                <button
                  className="rounded-lg bg-neon px-5 py-3 font-black text-ink hover:brightness-110 disabled:opacity-45"
                  disabled={calledNumbers.length >= 75}
                  onClick={callBingoNumber}
                  type="button"
                >
                  Call Number
                </button>
              </div>
              <div className="mt-5 grid gap-4 lg:grid-cols-[.8fr_1.2fr]">
                <div className="rounded-lg border border-white/10 bg-ink/70 p-5 text-center">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-white/45">Latest call</p>
                  <p className="mt-3 font-mono text-7xl font-black text-gold">{calledNumbers[0] || "--"}</p>
                  <p className="mt-2 text-sm text-white/55">{calledNumbers.length} of 75 called</p>
                  {bingoWin && (
                    <div className="mt-4 rounded-lg border border-neon/30 bg-neon/10 p-4 text-left">
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-neon">Winner</p>
                      <p className="mt-2 text-xl font-black text-white">{bingoWinner?.label || `Player ${cardPlayer}`}</p>
                      <p className="mt-1 text-sm font-bold text-gold">
                        Card {cardPlayer} | {bingoWin.type}
                      </p>
                    </div>
                  )}
                </div>
                <div className="rounded-lg border border-white/10 bg-ink/70 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-white/45">Card {cardPlayer}</p>
                    {bingoWin && <span className="rounded bg-neon px-2 py-1 text-xs font-black text-ink">Winner</span>}
                  </div>
                  <div className="mt-3 grid grid-cols-5 gap-1.5">
                    {bingoCard.map((number, index) => (
                      <div
                        className={`flex aspect-square items-center justify-center rounded-md border text-sm font-black ${
                          bingoWin?.indexes.includes(index)
                            ? "border-gold/45 bg-gold/20 text-gold"
                            : number === 0 || calledNumbers.includes(number)
                            ? "border-neon/35 bg-neon/15 text-neon"
                            : "border-white/10 bg-white/[0.03] text-white/70"
                        }`}
                        key={`${number}-${index}`}
                      >
                        {number === 0 ? "FREE" : number}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex max-h-32 flex-wrap gap-1.5 overflow-auto rounded-lg border border-white/10 bg-white/[0.03] p-3">
                {calledNumbers.length ? calledNumbers.map((number) => <NumberPill key={number} active>{number}</NumberPill>) : <p className="text-sm text-white/50">No calls yet.</p>}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number | string; tone: "neon" | "gold" | "hot" }) {
  const color = tone === "neon" ? "text-neon" : tone === "gold" ? "text-gold" : "text-hot";
  return (
    <div className="rounded-lg border border-white/10 bg-ink/80 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/40">{label}</p>
      <p className={`mt-2 font-mono text-3xl font-black ${color}`}>{value}</p>
    </div>
  );
}

function HistoryList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-white/45">{title}</p>
        <p className="text-xs font-bold text-white/40">{items.length}</p>
      </div>
      {items.length ? (
        <div className="mt-3 max-h-40 space-y-2 overflow-auto">
          {items.map((item, index) => (
            <div className="rounded-md border border-white/10 bg-ink/60 px-3 py-2 text-sm font-bold text-white/70" key={`${item}-${index}`}>
              {item}
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 rounded-md border border-white/10 bg-ink/60 px-3 py-4 text-center text-sm text-white/45">
          No history yet.
        </p>
      )}
    </div>
  );
}
