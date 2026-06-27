import { NextResponse } from "next/server";
import { getRoomWithTick, startGame } from "@/lib/room-store";

export async function POST(
  request: Request,
  { params }: { params: { code: string } }
) {
  try {
    const body = await request.json();
    const hostId = body.hostId as string;
    if (!hostId) {
      return NextResponse.json({ error: "Thiếu hostId" }, { status: 400 });
    }

    await startGame(params.code.toUpperCase(), hostId);
    const room = await getRoomWithTick(params.code.toUpperCase());

    return NextResponse.json({ room });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Không bắt đầu được";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
