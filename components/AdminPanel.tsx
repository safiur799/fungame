"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { GameStatus, SessionUser } from "@/types/result";
import type { Role } from "@/lib/admin-auth";

type UsersResponse = {
  users: SessionUser[];
  actor: SessionUser;
};

type MeResponse = {
  user: SessionUser | null;
  status: GameStatus;
};

type GameSettingsResponse = {
  durationMinutes: number;
  active: boolean;
  updatedAt: string;
};

type AnalyticsResponse = {
  summary: {
    admins: number;
    users: number;
    userCurrentPoints: number;
    adminCurrentPoints: number;
    totalGiven: number;
    totalTaken: number;
    totalLostToAdmins: number;
  };
  adminAnalytics: Array<{
    adminId: string;
    adminUsername: string;
    role: Role;
    points: number;
    active: boolean;
    createdUserCount: number;
    userCurrentPoints: number;
    givenToUsers: number;
    takenFromUsers: number;
    lossReceived: number;
    users: Array<{
      userId: string;
      username: string;
      points: number;
      active: boolean;
      givenByAdmin: number;
      takenByAdmin: number;
      lostToAdmin: number;
    }>;
  }>;
  recentTransactions: Array<{
    id: string;
    type: "give" | "take" | "loss";
    actorUsername: string;
    targetUsername: string;
    amount: number;
    roundId?: string;
    createdAt: string;
  }>;
};

type UserHistoryResponse = {
  user: SessionUser;
  summary: {
    games: number;
    spentPoints: number;
    wonPoints: number;
    lostPoints: number;
    netPoints: number;
  };
  history: Array<{
    roundId: string;
    drawTime: string;
    winningNumber: string;
    numbers: number[];
    entries: number;
    spentPoints: number;
    wonEntries: number;
    wonPoints: number;
    lostEntries: number;
    lostPoints: number;
    netPoints: number;
  }>;
};

type AdminHistoryResponse = {
  admin: {
    id: string;
    username: string;
    role: Role;
    points: number;
    active: boolean;
    createdAt: string;
  };
  summary: {
    createdUsers: number;
    userCurrentPoints: number;
    given: number;
    taken: number;
    lossReceived: number;
  };
  users: Array<{
    id: string;
    username: string;
    points: number;
    active: boolean;
    createdAt: string;
  }>;
  transactions: Array<{
    id: string;
    type: "give" | "take" | "loss";
    actorUsername: string;
    targetUsername: string;
    amount: number;
    roundId?: string;
    createdAt: string;
  }>;
};

const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  sub_admin: "Sub Admin",
  user: "User"
};

function UserTable({
  title,
  rows,
  canSeePoints,
  onToggle,
  onHistory,
  loading
}: {
  title: string;
  rows: SessionUser[];
  canSeePoints: boolean;
  onToggle: (user: SessionUser) => void;
  onHistory: (user: SessionUser) => void;
  loading: boolean;
}) {
  const [search, setSearch] = useState("");
  const visibleRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((user) =>
      [user.username, ROLE_LABELS[user.role], user.createdByUsername || ""].some((value) => value.toLowerCase().includes(query))
    );
  }, [rows, search]);

  return (
    <section className="rounded-xl border border-white/10 bg-panel/80 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-black">{title}</h2>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full rounded-lg border border-white/10 bg-ink px-3 py-2 text-sm text-white outline-none ring-neon/40 placeholder:text-white/35 focus:ring-2 sm:max-w-xs"
          placeholder="Search user"
        />
      </div>
      <div className="mt-4 grid gap-3 sm:hidden">
        {visibleRows.map((user) => (
          <div key={user.id} className="rounded-lg border border-white/10 bg-ink/75 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="break-words text-lg font-black">{user.username}</p>
                <p className="mt-1 text-xs text-white/55">
                  {ROLE_LABELS[user.role]} · {user.createdByUsername || "No creator"}
                </p>
              </div>
              <span className={`rounded-md px-2 py-1 text-xs font-black ${user.active ? "bg-neon/15 text-neon" : "bg-red-500/15 text-red-200"}`}>
                {user.active ? "Active" : "Blocked"}
              </span>
            </div>
            {canSeePoints && (
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                {[
                  ["Points", user.points ?? 0],
                  ["Given", user.pointsGivenByActor ?? 0],
                  ["Taken", user.pointsTakenByActor ?? 0],
                  ["Won", user.pointsWon ?? 0],
                  ["Lost", user.pointsLost ?? 0],
                  ["Profit", user.gameProfit ?? 0]
                ].map(([label, value]) => (
                  <div key={label} className="rounded-md border border-white/10 bg-white/[0.03] p-2">
                    <p className="text-white/45">{label}</p>
                    <p className={`mt-1 font-mono font-black ${label === "Profit" && Number(value) < 0 ? "text-red-200" : "text-white"}`}>
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 grid grid-cols-2 gap-2">
              {(user.role === "user" || user.role === "admin" || user.role === "sub_admin") && (
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => onHistory(user)}
                  className="rounded-md border border-neon/30 px-3 py-2 text-xs font-black text-neon hover:bg-neon/10 disabled:opacity-50"
                >
                  History
                </button>
              )}
              <button
                type="button"
                disabled={loading}
                onClick={() => onToggle(user)}
                className="rounded-md border border-red-400/30 px-3 py-2 text-xs font-black text-red-200 hover:bg-red-500/10 disabled:opacity-50"
              >
                {user.active ? "Block" : "Unblock"}
              </button>
            </div>
          </div>
        ))}
        {!visibleRows.length && <p className="rounded-lg border border-white/10 bg-ink/70 p-4 text-sm text-white/55">No records.</p>}
      </div>
      <div className="mt-4 hidden max-h-[420px] overflow-auto rounded-lg border border-white/10 sm:block">
        <table className="w-full min-w-[1040px] text-left text-sm">
          <thead className="sticky top-0 z-10 bg-panel text-xs uppercase tracking-[0.14em] text-white/45">
            <tr>
              <th className="px-3 py-2">Username</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Created By</th>
              {canSeePoints && <th className="py-2">Points</th>}
              {canSeePoints && <th className="py-2">Given</th>}
              {canSeePoints && <th className="py-2">Taken</th>}
              {canSeePoints && <th className="py-2">Won</th>}
              {canSeePoints && <th className="py-2">Lost</th>}
              {canSeePoints && <th className="py-2">Profit</th>}
              <th className="py-2">Active</th>
              <th className="py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((user) => (
              <tr key={user.id} className="border-t border-white/10">
                <td className="max-w-[180px] break-words px-3 py-3 font-black">{user.username}</td>
                <td className="px-3 py-3">{ROLE_LABELS[user.role]}</td>
                <td className="max-w-[180px] break-words px-3 py-3">{user.createdByUsername || "-"}</td>
                {canSeePoints && <td className="py-3 font-mono">{user.points ?? 0}</td>}
                {canSeePoints && <td className="py-3 font-mono">{user.pointsGivenByActor ?? 0}</td>}
                {canSeePoints && <td className="py-3 font-mono">{user.pointsTakenByActor ?? 0}</td>}
                {canSeePoints && <td className="py-3 font-mono">{user.pointsWon ?? 0}</td>}
                {canSeePoints && <td className="py-3 font-mono">{user.pointsLost ?? 0}</td>}
                {canSeePoints && (
                  <td className={`py-3 font-mono font-black ${(user.gameProfit ?? 0) >= 0 ? "text-neon" : "text-red-200"}`}>
                    {user.gameProfit ?? 0}
                  </td>
                )}
                <td className="py-3">{user.active ? "Yes" : "No"}</td>
                <td className="px-3 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    {(user.role === "user" || user.role === "admin" || user.role === "sub_admin") && (
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => onHistory(user)}
                        className="rounded-md border border-neon/30 px-3 py-2 text-xs font-black text-neon hover:bg-neon/10 disabled:opacity-50"
                      >
                        History
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => onToggle(user)}
                      className="rounded-md border border-red-400/30 px-3 py-2 text-xs font-black text-red-200 hover:bg-red-500/10 disabled:opacity-50"
                    >
                      {user.active ? "Block" : "Unblock"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!visibleRows.length && (
              <tr>
                <td className="border-t border-white/10 py-4 text-white/55" colSpan={canSeePoints ? 11 : 5}>
                  {rows.length ? "No matching user." : "No records."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function AdminPanel({ initialUser }: { initialUser: SessionUser | null }) {
  const [username, setUsername] = useState("superadmin");
  const [password, setPassword] = useState("");
  const [actor, setActor] = useState<SessionUser | null>(initialUser);
  const [users, setUsers] = useState<SessionUser[]>([]);
  const [status, setStatus] = useState<GameStatus | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [userHistory, setUserHistory] = useState<UserHistoryResponse | null>(null);
  const [adminHistory, setAdminHistory] = useState<AdminHistoryResponse | null>(null);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<Role>("user");
  const [pointUserId, setPointUserId] = useState("");
  const [points, setPoints] = useState("100");
  const [pointAction, setPointAction] = useState<"give" | "take">("give");
  const [gameDuration, setGameDuration] = useState("10");
  const [gameActive, setGameActive] = useState(true);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const canSeePoints = Boolean(actor);
  const isSuperAdmin = actor?.role === "super_admin";
  const actorId = actor?.id;
  const actorRole = actor?.role;

  const allowedRoles = useMemo<Role[]>(() => {
    if (actor?.role === "super_admin") return ["admin", "sub_admin", "user"];
    if (actor?.role === "admin") return ["user"];
    if (actor?.role === "sub_admin") return ["user"];
    return [];
  }, [actor?.role]);

  const pointTargets = users.filter((user) => {
    if (!actor) return false;
    if (actor.role === "super_admin") return user.role !== "super_admin";
    return user.role === "user";
  });
  const adminRows = users.filter((user) => user.role === "admin" || user.role === "sub_admin");
  const userRows = users.filter((user) => user.role === "user");

  const load = useCallback(async () => {
    const [usersResponse, meResponse, settingsResponse, analyticsResponse] = await Promise.all([
      fetch("/api/admin/users", { cache: "no-store" }),
      fetch("/api/auth/me", { cache: "no-store" }),
      actorRole === "super_admin" ? fetch("/api/admin/game-settings", { cache: "no-store" }) : Promise.resolve(null),
      actorRole === "super_admin" ? fetch("/api/admin/analytics", { cache: "no-store" }) : Promise.resolve(null)
    ]);
    if (usersResponse.ok) {
      const data = (await usersResponse.json()) as UsersResponse;
      setUsers(data.users);
      setActor(data.actor);
      if (!pointUserId && data.users[0]) setPointUserId(data.users.find((item) => item.role === "user")?.id || data.users[0].id);
    }
    if (meResponse.ok) {
      const data = (await meResponse.json()) as MeResponse;
      setStatus(data.status);
      if (!settingsResponse && data.status.game.durationMinutes) {
        setGameDuration(String(data.status.game.durationMinutes));
        setGameActive(data.status.game.active !== false);
      }
    }
    if (settingsResponse?.ok) {
      const data = (await settingsResponse.json()) as GameSettingsResponse;
      setGameDuration(String(data.durationMinutes));
      setGameActive(data.active);
    }
    if (analyticsResponse?.ok) {
      setAnalytics((await analyticsResponse.json()) as AnalyticsResponse);
    } else if (actorRole !== "super_admin") {
      setAnalytics(null);
    }
  }, [actorRole, pointUserId]);

  useEffect(() => {
    if (actorId) void load();
  }, [actorId, load]);

  async function login(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const response = await fetch("/api/admin/login", {
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
    setActor(data.user);
    setPassword("");
    await load();
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setActor(null);
    setUsers([]);
    setStatus(null);
    setAnalytics(null);
    setUserHistory(null);
    setAdminHistory(null);
  }

  async function createAccount(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: newUsername, password: newPassword, role: newRole })
    });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      setMessage(data.error || "Unable to create user");
      return;
    }
    setMessage(`Created ${data.user.username}`);
    setNewUsername("");
    setNewPassword("");
    await load();
  }

  async function managePoints(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const response = await fetch("/api/admin/points", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId: pointUserId, points: Number(points), action: pointAction })
    });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      setMessage(data.error || "Unable to update points");
      return;
    }
    setMessage(`${pointAction === "give" ? "Gave" : "Took"} points ${pointAction === "give" ? "to" : "from"} ${data.user.username}`);
    await load();
  }

  async function toggleUserActive(user: SessionUser) {
    setLoading(true);
    setMessage("");
    const response = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId: user.id, active: !user.active })
    });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      setMessage(data.error || "Unable to update user");
      return;
    }
    setMessage(`${data.user.active ? "Unblocked" : "Blocked"} ${data.user.username}`);
    await load();
  }

  async function loadUserHistory(user: SessionUser) {
    setLoading(true);
    setMessage("");
    const isAdminHistory = user.role === "admin" || user.role === "sub_admin";
    const url = isAdminHistory
      ? `/api/admin/admin-history?adminId=${encodeURIComponent(user.id)}`
      : `/api/admin/user-history?userId=${encodeURIComponent(user.id)}`;
    const response = await fetch(url, { cache: "no-store" });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      setMessage(data.error || "Unable to load history");
      return;
    }
    if (isAdminHistory) {
      setAdminHistory(data as AdminHistoryResponse);
      setUserHistory(null);
    } else {
      setUserHistory(data as UserHistoryResponse);
      setAdminHistory(null);
    }
  }

  async function runResult() {
    setLoading(true);
    setMessage("");
    const response = await fetch("/api/cron/draw", { method: "GET" });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      setMessage(data.error || "Unable to settle result");
      return;
    }
    setMessage(`Settled ${data.result.drawNumber}: winner ${data.result.winningNumber}`);
    await load();
  }

  async function saveGameSettings(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const response = await fetch("/api/admin/game-settings", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ durationMinutes: Number(gameDuration), active: gameActive })
    });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      setMessage(data.error || "Unable to save game settings");
      return;
    }
    setMessage(`Game ${data.active ? "running" : "stopped"} · ${data.durationMinutes} min`);
    await load();
  }

  if (!actor) {
    return (
      <form onSubmit={login} className="mx-auto max-w-md rounded-xl border border-white/10 bg-panel/80 p-5 shadow-glow">
        <h1 className="text-2xl font-black text-white">Admin Login</h1>
        <p className="mt-2 text-sm text-white/60">Default super admin: superadmin + ADMIN_PASSWORD.</p>
        <input
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          className="mt-5 w-full rounded-lg border border-white/10 bg-ink px-3 py-3 text-white outline-none ring-neon/40 focus:ring-2"
          placeholder="Username"
          required
        />
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          className="mt-3 w-full rounded-lg border border-white/10 bg-ink px-3 py-3 text-white outline-none ring-neon/40 focus:ring-2"
          placeholder="Password"
          required
        />
        {message && <p className="mt-3 text-sm text-red-200">{message}</p>}
        <button disabled={loading} className="mt-5 w-full rounded-lg bg-neon px-4 py-3 font-black text-ink disabled:opacity-60">
          Unlock
        </button>
      </form>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-black">RBAC Admin</h1>
          <p className="mt-1 text-sm text-white/60">
            {actor.username} · {ROLE_LABELS[actor.role]}
            {canSeePoints ? ` · ${actor.points ?? 0} points` : ""}
          </p>
        </div>
        <button className="rounded-lg border border-white/10 px-4 py-3 text-sm font-black" onClick={logout} type="button">
          Logout
        </button>
      </div>

      <section className="grid gap-5 xl:grid-cols-2">
        <form onSubmit={createAccount} className="min-w-0 rounded-xl border border-neon/20 bg-panel/80 p-4 sm:p-5">
          <h2 className="text-xl font-black">Create Account</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input
              value={newUsername}
              onChange={(event) => setNewUsername(event.target.value)}
              className="rounded-lg border border-white/10 bg-ink px-3 py-3 text-white outline-none ring-neon/40 focus:ring-2"
              placeholder="Username"
              required
            />
            <input
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="rounded-lg border border-white/10 bg-ink px-3 py-3 text-white outline-none ring-neon/40 focus:ring-2"
              placeholder="Password"
              required
            />
            <select
              value={newRole}
              onChange={(event) => setNewRole(event.target.value as Role)}
              className="rounded-lg border border-white/10 bg-ink px-3 py-3 text-white outline-none ring-neon/40 focus:ring-2"
            >
              {allowedRoles.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </select>
            <button disabled={loading || !allowedRoles.length} className="rounded-lg bg-neon px-4 py-3 font-black text-ink disabled:opacity-60">
              Create
            </button>
          </div>
        </form>

        {canSeePoints && (
          <form onSubmit={managePoints} className="min-w-0 rounded-xl border border-gold/20 bg-panel/80 p-4 sm:p-5">
            <h2 className="text-xl font-black">Manage Points</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_120px_120px] xl:grid-cols-[minmax(0,1fr)_120px_120px]">
              <select
                value={pointUserId}
                onChange={(event) => setPointUserId(event.target.value)}
                className="min-w-0 rounded-lg border border-white/10 bg-ink px-3 py-3 text-white outline-none ring-neon/40 focus:ring-2"
              >
                {pointTargets.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.username} ({ROLE_LABELS[user.role]}) · {user.points ?? 0}
                  </option>
                ))}
              </select>
              <select
                value={pointAction}
                onChange={(event) => setPointAction(event.target.value as "give" | "take")}
                className="rounded-lg border border-white/10 bg-ink px-3 py-3 text-white outline-none ring-neon/40 focus:ring-2"
              >
                <option value="give">Give</option>
                <option value="take">Take</option>
              </select>
              <input
                value={points}
                onChange={(event) => setPoints(event.target.value.replace(/\D/g, ""))}
                className="rounded-lg border border-white/10 bg-ink px-3 py-3 font-mono text-white outline-none ring-neon/40 focus:ring-2"
                inputMode="numeric"
                required
              />
              <button
                disabled={loading || !pointTargets.length}
                className="w-full rounded-lg bg-hot px-4 py-3 font-black text-white disabled:opacity-60 md:col-span-3"
              >
                Save
              </button>
            </div>
          </form>
        )}
      </section>

      {isSuperAdmin && (
        <form onSubmit={saveGameSettings} className="rounded-xl border border-neon/20 bg-panel/80 p-5">
          <h2 className="text-xl font-black">Game Settings</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-[160px_180px_auto]">
            <input
              value={gameDuration}
              onChange={(event) => setGameDuration(event.target.value.replace(/\D/g, ""))}
              className="rounded-lg border border-white/10 bg-ink px-3 py-3 font-mono text-white outline-none ring-neon/40 focus:ring-2"
              inputMode="numeric"
              min="1"
              max="1440"
              required
            />
            <select
              value={gameActive ? "active" : "stopped"}
              onChange={(event) => setGameActive(event.target.value === "active")}
              className="rounded-lg border border-white/10 bg-ink px-3 py-3 text-white outline-none ring-neon/40 focus:ring-2"
            >
              <option value="active">Running</option>
              <option value="stopped">Stopped</option>
            </select>
            <button disabled={loading} className="rounded-lg bg-neon px-4 py-3 font-black text-ink disabled:opacity-60">
              Save Time
            </button>
          </div>
          <p className="mt-2 text-sm text-white/55">Current game: {status?.game.durationMinutes || gameDuration} min</p>
        </form>
      )}

      <section className="rounded-xl border border-white/10 bg-panel/80 p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-black">Game Result</h2>
            <p className="mt-1 text-sm text-white/60">System picks number with minimum active total. Cron also calls this endpoint.</p>
          </div>
          <button disabled={loading} onClick={runResult} className="rounded-lg border border-neon/30 px-4 py-3 font-black text-neon">
            Settle Previous Round
          </button>
        </div>
        {status && (
          <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6 md:grid-cols-12">
            {Object.entries(status.numberTotals).map(([number, total]) => (
              <div key={number} className="rounded-lg border border-white/10 bg-ink/75 p-3">
                <p className="font-mono text-xl font-black">#{number}</p>
                {canSeePoints && <p className="mt-1 text-xs text-white/55">{total} pts</p>}
              </div>
            ))}
          </div>
        )}
      </section>

      {isSuperAdmin && (
        <UserTable
          title="Admin Creation"
          rows={adminRows}
          canSeePoints={canSeePoints}
          onToggle={toggleUserActive}
          onHistory={loadUserHistory}
          loading={loading}
        />
      )}
      <UserTable
        title={isSuperAdmin ? "User Creation" : "My Users"}
        rows={isSuperAdmin ? userRows : users}
        canSeePoints={canSeePoints}
        onToggle={toggleUserActive}
        onHistory={loadUserHistory}
        loading={loading}
      />

      {adminHistory && (
        <section className="rounded-xl border border-white/10 bg-panel/80 p-4 sm:p-5">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-black">Admin History</h2>
              <p className="mt-1 text-sm text-white/60">
                {adminHistory.admin.username} · {ROLE_LABELS[adminHistory.admin.role]} · {adminHistory.admin.points} points
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAdminHistory(null)}
              className="rounded-lg border border-white/10 px-4 py-2 text-sm font-black"
            >
              Close
            </button>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[
              ["Users", adminHistory.summary.createdUsers],
              ["User Points", adminHistory.summary.userCurrentPoints],
              ["Given", adminHistory.summary.given],
              ["Taken", adminHistory.summary.taken],
              ["Loss Received", adminHistory.summary.lossReceived]
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-white/10 bg-ink/75 p-3">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-white/45">{label}</p>
                <p className="mt-2 font-mono text-xl font-black text-white">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-white/10 bg-ink/70 p-4">
              <h3 className="font-black">Created Users</h3>
              <div className="mt-3 grid max-h-72 gap-2 overflow-auto pr-1">
                {adminHistory.users.map((user) => (
                  <div key={user.id} className="rounded-md border border-white/10 bg-white/[0.03] p-3 text-sm">
                    <div className="flex justify-between gap-2">
                      <span className="break-words font-black">{user.username}</span>
                      <span className="font-mono text-gold">{user.points} pts</span>
                    </div>
                    <p className="mt-1 text-xs text-white/50">{user.active ? "Active" : "Blocked"}</p>
                  </div>
                ))}
                {!adminHistory.users.length && <p className="text-sm text-white/55">No users.</p>}
              </div>
            </div>
            <div className="rounded-lg border border-white/10 bg-ink/70 p-4">
              <h3 className="font-black">Point History</h3>
              <div className="mt-3 grid max-h-72 gap-2 overflow-auto pr-1">
                {adminHistory.transactions.map((item) => (
                  <div key={item.id} className="rounded-md border border-white/10 bg-white/[0.03] p-3 text-sm">
                    <div className="grid gap-1 sm:grid-cols-[1fr_auto]">
                      <span className="break-words">
                        {item.type === "loss" ? "Loss" : item.type === "give" ? "Give" : "Take"} · {item.actorUsername} →{" "}
                        {item.targetUsername}
                      </span>
                      <span className="font-mono text-gold">{item.amount} pts</span>
                    </div>
                    {item.roundId && <p className="mt-1 break-all font-mono text-xs text-white/45">{item.roundId}</p>}
                  </div>
                ))}
                {!adminHistory.transactions.length && <p className="text-sm text-white/55">No point history.</p>}
              </div>
            </div>
          </div>
        </section>
      )}

      {userHistory && (
        <section className="rounded-xl border border-white/10 bg-panel/80 p-5">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-black">User Game History</h2>
              <p className="mt-1 text-sm text-white/60">
                {userHistory.user.username} · {userHistory.summary.games} games · balance {userHistory.user.points ?? 0}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setUserHistory(null)}
              className="rounded-lg border border-white/10 px-4 py-2 text-sm font-black"
            >
              Close
            </button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              ["Spent", userHistory.summary.spentPoints],
              ["Won", userHistory.summary.wonPoints],
              ["Lost", userHistory.summary.lostPoints],
              ["Net", userHistory.summary.netPoints],
              ["Games", userHistory.summary.games]
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-white/10 bg-ink/75 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">{label}</p>
                <p className="mt-2 font-mono text-2xl font-black text-white">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 max-h-[420px] overflow-auto rounded-lg border border-white/10">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="sticky top-0 z-10 bg-panel text-xs uppercase tracking-[0.14em] text-white/45">
                <tr>
                  <th className="px-3 py-2">Round</th>
                  <th className="px-3 py-2">Winner</th>
                  <th className="px-3 py-2">Numbers</th>
                  <th className="py-2">Spent</th>
                  <th className="py-2">Won</th>
                  <th className="py-2">Lost</th>
                  <th className="py-2">Net</th>
                </tr>
              </thead>
              <tbody>
                {userHistory.history.map((item) => (
                  <tr key={item.roundId} className="border-t border-white/10">
                    <td className="px-3 py-3 font-mono">{item.roundId}</td>
                    <td className="px-3 py-3 font-mono">#{item.winningNumber}</td>
                    <td className="max-w-[300px] px-3 py-3">
                      <div className="max-h-16 overflow-auto break-words rounded-md bg-white/[0.03] px-2 py-1">
                        {item.numbers.join(", ")}
                      </div>
                    </td>
                    <td className="py-3 font-mono">{item.spentPoints}</td>
                    <td className="py-3 font-mono">
                      {item.wonPoints} ({item.wonEntries})
                    </td>
                    <td className="py-3 font-mono">
                      {item.lostPoints} ({item.lostEntries})
                    </td>
                    <td className={`py-3 font-mono font-black ${item.netPoints >= 0 ? "text-neon" : "text-red-200"}`}>
                      {item.netPoints}
                    </td>
                  </tr>
                ))}
                {!userHistory.history.length && (
                  <tr>
                    <td className="border-t border-white/10 py-4 text-white/55" colSpan={7}>
                      No previous game history.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {isSuperAdmin && analytics && (
        <section className="rounded-xl border border-white/10 bg-panel/80 p-5">
          <h2 className="text-xl font-black">Super Admin Analytics</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Admins", analytics.summary.admins],
              ["Users", analytics.summary.users],
              ["Admin Points", analytics.summary.adminCurrentPoints],
              ["User Points", analytics.summary.userCurrentPoints],
              ["Given", analytics.summary.totalGiven],
              ["Taken", analytics.summary.totalTaken],
              ["User Lost", analytics.summary.totalLostToAdmins]
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-white/10 bg-ink/75 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">{label}</p>
                <p className="mt-2 font-mono text-2xl font-black text-white">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-4">
            {analytics.adminAnalytics.map((admin) => (
              <div key={admin.adminId} className="rounded-lg border border-white/10 bg-ink/70 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-lg font-black">{admin.adminUsername}</p>
                    <p className="text-xs text-white/55">
                      {ROLE_LABELS[admin.role]} · {admin.createdUserCount} users · {admin.points} points
                    </p>
                  </div>
                  <p className="font-mono text-sm text-gold">
                    Given {admin.givenToUsers} · Taken {admin.takenFromUsers} · Lost received {admin.lossReceived}
                  </p>
                </div>
                <div className="mt-3 max-h-[320px] overflow-auto rounded-lg border border-white/10">
                  <table className="w-full min-w-[760px] text-left text-xs">
                    <thead className="sticky top-0 z-10 bg-ink uppercase tracking-[0.14em] text-white/45">
                      <tr>
                        <th className="py-2">User</th>
                        <th className="py-2">Points</th>
                        <th className="py-2">Given By Admin</th>
                        <th className="py-2">Taken By Admin</th>
                        <th className="py-2">Lost To Admin</th>
                        <th className="py-2">Active</th>
                      </tr>
                    </thead>
                    <tbody>
                      {admin.users.map((user) => (
                        <tr key={user.userId} className="border-t border-white/10">
                          <td className="max-w-[180px] break-words py-2 font-black">{user.username}</td>
                          <td className="py-2 font-mono">{user.points}</td>
                          <td className="py-2 font-mono">{user.givenByAdmin}</td>
                          <td className="py-2 font-mono">{user.takenByAdmin}</td>
                          <td className="py-2 font-mono">{user.lostToAdmin}</td>
                          <td className="py-2">{user.active ? "Yes" : "No"}</td>
                        </tr>
                      ))}
                      {!admin.users.length && (
                        <tr>
                          <td className="border-t border-white/10 py-3 text-white/55" colSpan={6}>
                            No users.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {isSuperAdmin && analytics && (
        <section className="rounded-xl border border-white/10 bg-panel/80 p-5">
          <h2 className="text-xl font-black">Point Flow</h2>
          <div className="mt-4 grid gap-2">
            {analytics.recentTransactions.slice(0, 30).map((transaction) => (
              <div key={transaction.id} className="grid gap-2 rounded-lg border border-white/10 bg-ink/70 p-3 text-sm sm:grid-cols-[1fr_auto]">
                <span className="max-h-16 overflow-auto break-words">
                  {transaction.type === "loss" ? "Loss" : transaction.type === "give" ? "Give" : "Take"} · {transaction.actorUsername} →{" "}
                  {transaction.targetUsername}
                </span>
                <span className="whitespace-nowrap font-mono text-gold">
                  {transaction.amount} pts{transaction.roundId ? ` · ${transaction.roundId}` : ""}
                </span>
              </div>
            ))}
            {!analytics.recentTransactions.length && <p className="text-sm text-white/55">No point flow yet.</p>}
          </div>
        </section>
      )}

      <section className="rounded-xl border border-white/10 bg-panel/80 p-5">
        <h2 className="text-xl font-black">Recent Results</h2>
        <div className="mt-3 grid max-h-[520px] gap-2 overflow-auto pr-1">
          {status?.recent.map((result) => (
            <div key={result.id} className="rounded-lg border border-white/10 bg-ink/70 p-3 text-sm">
              <div className="flex flex-wrap justify-between gap-2">
                <span>{result.drawNumber}</span>
                <span className="font-mono text-gold">Winner #{result.winningNumber}</span>
              </div>
              <div className="mt-2 max-h-24 overflow-auto rounded-md bg-white/[0.03] p-2 text-xs text-white/65">
                <span className="font-bold text-white/80">Winning users: </span>
                {result.winners?.length
                  ? result.winners
                      .map((winner) =>
                        canSeePoints
                          ? `${winner.username} x${winner.entries} (${winner.paidPoints || 0} pts)`
                          : `${winner.username} x${winner.entries}`
                      )
                      .join(", ")
                  : "No winner"}
              </div>
              {canSeePoints && (
                <>
                  <p className="mt-1 text-xs text-white/50">
                    Points {result.totalBetPoints || 0} · Winners {result.winnerCount || 0} · Paid {result.paidPoints || 0}
                  </p>
                  <p className="mt-1 max-h-24 overflow-auto rounded-md bg-white/[0.03] p-2 text-xs text-white/50">
                    Lost:{" "}
                    {result.losses?.length
                      ? result.losses.map((loss) => `${loss.username} → ${loss.adminUsername} (${loss.lostPoints} pts)`).join(", ")
                      : "0"}
                  </p>
                </>
              )}
            </div>
          ))}
          {!status?.recent.length && <p className="text-sm text-white/55">No result yet.</p>}
        </div>
      </section>

      {message && <p className="rounded-lg border border-gold/20 bg-gold/10 p-4 text-sm text-gold">{message}</p>}
    </div>
  );
}
