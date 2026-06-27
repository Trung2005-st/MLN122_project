import { NextResponse } from "next/server";
import type { Allocation } from "@/lib/types";
import { getRoomWithTick, submitAllocation } from "@/lib/room-store";

export async function POST(
  request: Request,
  { params }: { params: { code: string } }
) {
  try {
    const body = await request.json();
    const playerId = body.playerId as string;
    const allocation = body.allocation as Allocation;

    if (!playerId || !allocation) {
      return NextResponse.json({ error: "Thiếu dữ liệu" }, { status: 400 });
    }

    await submitAllocation(params.code.toUpperCase(), playerId, allocation);
    const room = await getRoomWithTick(params.code.toUpperCase());

    return NextResponse.json({ ok: true, room });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Không gửi được phân bổ";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
