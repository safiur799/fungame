import type { Role } from "@/lib/admin-auth";

export type Result = {
  id: string;
  gameId: string;
  gameName: string;
  drawNumber: string;
  winningNumber: string;
  drawTime: string;
  createdAt: string;
  totalBetPoints?: number;
  winnerCount?: number;
  paidPoints?: number;
  numberTotals?: Record<string, number>;
  winners?: Array<{
    userId: string;
    username: string;
    entries: number;
    paidPoints?: number;
  }>;
  losses?: Array<{
    userId: string;
    username: string;
    adminId: string;
    adminUsername: string;
    lostPoints: number;
  }>;
};

export type Game = {
  id: string;
  name: string;
  minNumber: number;
  maxNumber: number;
  drawTimes?: string[];
  active?: boolean;
  durationMinutes?: number;
  entryLockSeconds?: number;
  createdAt?: string;
  updatedAt?: string;
  entryPoints?: number;
  winPoints?: number;
};

export type Bet = {
  id: string;
  roundId: string;
  userId: string;
  username: string;
  number: number;
  points?: number;
  createdAt: string;
};

export type SessionUser = {
  id: string;
  username: string;
  role: Role;
  points?: number;
  active: boolean;
  createdBy?: string;
  createdByUsername?: string;
  pointsGivenByActor?: number;
  pointsTakenByActor?: number;
  pointsLost?: number;
  pointsWon?: number;
  gameProfit?: number;
};

export type PaginatedResults = {
  items: Result[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type GameStatus = {
  game: Game;
  roundId: string;
  roundStart: string;
  nextDrawTime: string;
  entryClosesAt: string;
  serverTime: string;
  numberTotals: Record<string, number>;
  recent: Result[];
  myBets: Bet[];
};

export type CurrentDrawStatus = {
  latest: Result | null;
  recent: Result[];
  nextDrawTime: string;
  nextDrawNumber: string;
  serverTime: string;
  schedule: string[];
  game: Game;
  games: Array<{
    game: Game;
    latest: Result | null;
    pastResults: Result[];
    nextDrawTime: string;
    nextDrawNumber: string;
    schedule: string[];
  }>;
};
