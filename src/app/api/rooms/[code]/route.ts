import { NextResponse } from "next/server";
import {
  getRoomWithTick,
  sanitizeRoomForClient,
} from "@/lib/room-store";

export async function GET(
  request: Request,
  { params }: { params: { code: string } }
) {
  try {
    const code = params.code.toUpperCase();
    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get("playerId") ?? "";

    const room = await getRoomWithTick(code);
    if (!room) {
      return NextResponse.json({ error: "Phòng không tồn tại" }, { status: 404 });
    }

    const clientRoom = playerId
      ? sanitizeRoomForClient(room, playerId)
      : room;

    return NextResponse.json({
      room: clientRoom,
      serverTime: Date.now(),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lỗi tải phòng";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
