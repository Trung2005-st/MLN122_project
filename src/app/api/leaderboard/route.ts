import { NextResponse } from "next/server";
import { getLeaderboard } from "@/lib/room-store";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      100,
      parseInt(searchParams.get("limit") ?? "50", 10) || 50
    );
    const entries = await getLeaderboard(limit);
    return NextResponse.json({ entries, serverTime: Date.now() });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lỗi bảng xếp hạng";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
