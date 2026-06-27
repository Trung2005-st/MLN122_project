import { NextResponse } from "next/server";
import { createRoom } from "@/lib/room-store";
import type { CharacterClass } from "@/lib/types";
import { customAlphabet } from "nanoid";

const VALID_CLASSES: CharacterClass[] = [
  "lender",
  "borrower",
  "farmer",
  "speculator",
];

const genPlayerId = customAlphabet(
  "0123456789abcdefghijklmnopqrstuvwxyz",
  16
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const hostName = (body.hostName as string)?.trim();
    const characterClass = body.characterClass as CharacterClass | undefined;
    if (!hostName || hostName.length < 2 || hostName.length > 20) {
      return NextResponse.json(
        { error: "Tên phải từ 2–20 ký tự" },
        { status: 400 }
      );
    }
    if (characterClass && !VALID_CLASSES.includes(characterClass)) {
      return NextResponse.json({ error: "Nhân vật không hợp lệ" }, { status: 400 });
    }

    const hostId = genPlayerId();
    const room = await createRoom(hostId, hostName, characterClass);

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
