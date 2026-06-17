import type { Result } from "@/types/result";
import { formatDrawTime } from "@/lib/format";

export function ResultTable({
  results,
  showActions,
  onEdit,
  onDelete
}: {
  results: Result[];
  showActions?: boolean;
  onEdit?: (result: Result) => void;
  onDelete?: (id: string) => void;
}) {
  if (!results.length) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/[0.03] p-6 text-center text-sm text-white/60">
        No draw results found.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-white/10">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead className="bg-white/[0.06] text-xs uppercase tracking-[0.14em] text-white/50">
            <tr>
              <th className="px-4 py-3">Draw</th>
              <th className="px-4 py-3">Number</th>
              <th className="px-4 py-3">Status</th>
              {showActions && <th className="px-4 py-3 text-right">Action</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {results.map((result) => (
              <tr key={result.id} className="bg-panel/50">
                <td className="px-4 py-3">
                  <div className="text-xs font-black uppercase tracking-[0.14em] text-hot">{result.gameName}</div>
                  <div className="font-semibold text-white/85">{formatDrawTime(result.drawTime)}</div>
                  <div className="mt-1 font-mono text-xs text-white/40">ID: {result.drawNumber}</div>
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-md border border-neon/25 bg-neon/10 px-3 py-1 font-mono text-lg font-black text-neon">
                    {result.winningNumber}
                  </span>
                </td>
                <td className="px-4 py-3 text-white/70">Published</td>
                {showActions && (
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => onEdit?.(result)}
                        className="rounded-md border border-neon/30 px-3 py-2 text-xs font-bold text-neon hover:bg-neon/10"
                        type="button"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDelete?.(result.id)}
                        className="rounded-md border border-red-400/30 px-3 py-2 text-xs font-bold text-red-200 hover:bg-red-500/10"
                        type="button"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
