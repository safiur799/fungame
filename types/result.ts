export type DrawStatus = "pending" | "completed";

export type Result = {
  id: string;
  gameId: string;
  gameName: string;
  drawNumber: string;
  winningNumber: string;
  drawTime: string;
  createdAt: string;
};

export type Game = {
  id: string;
  name: string;
  minNumber: number;
  maxNumber: number;
  drawTimes: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PaginatedResults = {
  items: Result[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
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
