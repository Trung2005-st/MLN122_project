import { NextResponse } from "next/server";
import { createRoom } from "@/lib/room-store";
import { customAlphabet } from "nanoid";

const genPlayerId = customAlphabet(
  "0123456789abcdefghijklmnopqrstuvwxyz",
  16
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const hostName = (body.hostName as string)?.trim();
    if (!hostName || hostName.length < 2 || hostName.length > 20) {
      return NextResponse.json(
        { error: "Tên phải từ 2–20 ký tự" },
        { status: 400 }
      );
    }

    const hostId = genPlayerId();
    const room = await createRoom(hostId, hostName);

    return NextResponse.json({
      code: room.code,
      playerId: hostId,
      isHost: true,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lỗi tạo phòng";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
