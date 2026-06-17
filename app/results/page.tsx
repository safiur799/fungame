import type { Metadata } from "next";
import { ResultTable } from "@/components/ResultTable";
import { ensureDueDraws } from "@/lib/draw";
import { listResults } from "@/lib/results";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Results",
  description: "Complete Daily Number Draw result history with date filters, draw search, and pagination."
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ResultsPage({ searchParams }: { searchParams?: SearchParams }) {
  const params = searchParams ? await searchParams : {};
  const page = Number(single(params.page) || "1");
  const date = single(params.date) || "";
  const drawNumber = single(params.drawNumber) || "";
  let data;
  let error = "";

  try {
    await ensureDueDraws();
    data = await listResults({ page, pageSize: 20, date: date || undefined, drawNumber: drawNumber || undefined });
  } catch (caught) {
    error = caught instanceof Error ? caught.message : "Unable to load results";
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-white">Result History</h1>
        <p className="mt-2 text-sm text-white/60">Search complete draw records and filter by date.</p>
      </div>

      <form className="grid gap-3 rounded-xl border border-white/10 bg-panel/75 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="block">
          <span className="text-sm font-bold text-white/70">Date</span>
          <input
            className="mt-2 w-full rounded-lg border border-white/10 bg-ink px-3 py-3 text-white outline-none ring-neon/40 focus:ring-2"
            type="date"
            name="date"
            defaultValue={date}
          />
        </label>
        <label className="block">
          <span className="text-sm font-bold text-white/70">Draw number</span>
          <input
            className="mt-2 w-full rounded-lg border border-white/10 bg-ink px-3 py-3 font-mono text-white outline-none ring-neon/40 focus:ring-2"
            name="drawNumber"
            placeholder="20260617-1000"
            defaultValue={drawNumber}
          />
        </label>
        <button className="rounded-lg bg-neon px-5 py-3 font-black text-ink hover:brightness-110" type="submit">
          Search
        </button>
      </form>

      {error && (
        <div className="rounded-lg border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-100">{error}</div>
      )}

      {data && (
        <>
          <ResultTable results={data.items} />
          <div className="flex flex-col justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm text-white/70 sm:flex-row sm:items-center">
            <span>
              Page {data.page} of {data.totalPages} · {data.total} results
            </span>
            <div className="flex gap-2">
              <a
                aria-disabled={data.page <= 1}
                className="rounded-md border border-white/10 px-3 py-2 aria-disabled:pointer-events-none aria-disabled:opacity-40"
                href={`/results?date=${encodeURIComponent(date)}&drawNumber=${encodeURIComponent(drawNumber)}&page=${Math.max(1, data.page - 1)}`}
              >
                Previous
              </a>
              <a
                aria-disabled={data.page >= data.totalPages}
                className="rounded-md border border-white/10 px-3 py-2 aria-disabled:pointer-events-none aria-disabled:opacity-40"
                href={`/results?date=${encodeURIComponent(date)}&drawNumber=${encodeURIComponent(drawNumber)}&page=${Math.min(data.totalPages, data.page + 1)}`}
              >
                Next
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
