"use client";

import { useMemo, useState } from "react";
import { ResultTable } from "@/components/ResultTable";
import type { Result } from "@/types/result";

const PAGE_SIZE = 10;

export function PaginatedResultsTable({ results }: { results: Result[] }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const visibleResults = useMemo(() => results.slice(start, start + PAGE_SIZE), [results, start]);

  return (
    <div className="space-y-3">
      <ResultTable results={visibleResults} />
      {results.length > PAGE_SIZE && (
        <div className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-white/58">
            Page {currentPage} of {totalPages} | Showing {start + 1}-{Math.min(start + PAGE_SIZE, results.length)} of{" "}
            {results.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              className="rounded-md border border-white/10 px-3 py-2 text-sm font-black text-white/70 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={currentPage === 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              type="button"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
              <button
                aria-current={pageNumber === currentPage ? "page" : undefined}
                className={`h-10 w-10 rounded-md border text-sm font-black ${
                  pageNumber === currentPage
                    ? "border-neon/40 bg-neon/15 text-neon"
                    : "border-white/10 text-white/70 hover:bg-white/10"
                }`}
                key={pageNumber}
                onClick={() => setPage(pageNumber)}
                type="button"
              >
                {pageNumber}
              </button>
            ))}
            <button
              className="rounded-md border border-white/10 px-3 py-2 text-sm font-black text-white/70 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={currentPage === totalPages}
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              type="button"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
