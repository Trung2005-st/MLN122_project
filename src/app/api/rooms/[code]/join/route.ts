import { NextResponse } from "next/server";
import { joinRoom } from "@/lib/room-store";
import type { CharacterClass } from "@/lib/types";

const VALID_CLASSES: CharacterClass[] = [
  "lender",
  "borrower",
  "farmer",
  "speculator",
];

export async function POST(
  request: Request,
  { params }: { params: { code: string } }
) {
  try {
    const body = await request.json();
    const playerName = (body.playerName as string)?.trim();
    const playerId = body.playerId as string | undefined;
    const characterClass = body.characterClass as CharacterClass | undefined;

    if (!playerName || playerName.length < 2 || playerName.length > 20) {
      return NextResponse.json(
        { error: "Tên phải từ 2–20 ký tự" },
        { status: 400 }
      );
    }
    if (characterClass && !VALID_CLASSES.includes(characterClass)) {
      return NextResponse.json({ error: "Nhân vật không hợp lệ" }, { status: 400 });
    }

    const { customAlphabet } = await import("nanoid");
    const genId = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 16);
    const id = playerId ?? genId();

    const { room, player } = await joinRoom(
      params.code.toUpperCase(),
      id,
      playerName,
      characterClass
    );

    return NextResponse.json({
      playerId: player.id,
      isHost: player.isHost,
      code: room.code,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Không vào được phòng";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
