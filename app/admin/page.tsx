import type { Metadata } from "next";
import { AdminPanel } from "@/components/AdminPanel";
import { getCurrentUser } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin",
  robots: {
    index: false,
    follow: false
  }
};

export default async function AdminPage() {
  const user = await getCurrentUser();
  const initialUser =
    user && user.role !== "user"
      ? {
          id: user.id,
          username: user.username,
          role: user.role,
          points: user.points,
          active: user.active
        }
      : null;
  return <AdminPanel initialUser={initialUser} />;
}
