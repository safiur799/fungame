import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { resultsCollection } from "@/lib/results";

export const dynamic = "force-dynamic";

function csvEscape(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const collection = await resultsCollection();
  const docs = await collection.find({}).sort({ drawTime: -1 }).toArray();
  const rows = [
    ["id", "drawNumber", "winningNumber", "drawTime", "createdAt"],
    ...docs.map((doc) => [
      doc.id,
      doc.drawNumber,
      doc.winningNumber,
      doc.drawTime.toISOString(),
      doc.createdAt.toISOString()
    ])
  ];
  const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="daily-number-draw-results.csv"`
    }
  });
}
