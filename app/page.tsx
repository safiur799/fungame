import { GameBoard } from "@/components/GameBoard";
import { getCurrentUser } from "@/lib/admin-auth";
import { getGameStatus, serializeGameStatus } from "@/lib/hourly-game";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getCurrentUser();
  const status = serializeGameStatus(await getGameStatus(user), user?.role === "super_admin");

  return (
    <GameBoard
      initialUser={
        user
          ? {
              id: user.id,
              username: user.username,
              role: user.role,
              points: user.points,
              active: user.active
            }
          : null
      }
      initialStatus={status}
    />
  );
}
