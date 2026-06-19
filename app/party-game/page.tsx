import type { Metadata } from "next";
import { OfflinePartyGame } from "@/components/OfflinePartyGame";

export const metadata: Metadata = {
  title: "Offline Party Game",
  description: "Host-led offline group games for small and large rooms."
};

export default function PartyGamePage() {
  return <OfflinePartyGame />;
}
