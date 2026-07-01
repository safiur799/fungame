import type { Metadata } from "next";
import { ResultTable } from "@/components/ResultTable";
import { listGameResults, settlePreviousRound } from "@/lib/hourly-game";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Results",
  description: "1-12 number game results."
};

export default async function ResultsPage() {
  await settlePreviousRound();
  const results = await listGameResults(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-white">Result History</h1>
        <p className="mt-2 text-sm text-white/60">Results. Winner is number with minimum active total.</p>
      </div>
      <ResultTable results={results} />
    </div>
  );
}
