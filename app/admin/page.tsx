import type { Metadata } from "next";
import { AdminPanel } from "@/components/AdminPanel";
import { isAdminFromCookies } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin",
  robots: {
    index: false,
    follow: false
  }
};

export default async function AdminPage() {
  const isAdmin = await isAdminFromCookies();
  return <AdminPanel isAdmin={isAdmin} />;
}
