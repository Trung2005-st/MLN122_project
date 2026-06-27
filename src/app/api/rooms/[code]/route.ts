import { NextResponse } from "next/server";
import {
  getClientCombatQuestion,
  getRoomWithTick,
  handleAction,
  sanitizeRoomForClient,
} from "@/lib/room-store";
import type { ActionPayload } from "@/lib/room-store";

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

    const clientRoom = sanitizeRoomForClient(room);
    const combatQuestion = playerId
      ? getClientCombatQuestion(room, playerId)
      : null;

    return NextResponse.json({
      room: clientRoom,
      combatQuestion,
      serverTime: Date.now(),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lỗi tải phòng";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { code: string } }
) {
  try {
    const body = await request.json();
    const playerId = body.playerId as string;
    const action = body.action as ActionPayload;
    if (!playerId || !action?.type) {
      return NextResponse.json({ error: "Thiếu dữ liệu" }, { status: 400 });
    }

    const room = await handleAction(params.code.toUpperCase(), playerId, action);
    const combatQuestion = getClientCombatQuestion(room, playerId);

    return NextResponse.json({
      room: sanitizeRoomForClient(room),
      combatQuestion,
      serverTime: Date.now(),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lỗi xử lý";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
