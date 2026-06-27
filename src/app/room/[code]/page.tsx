import { GameRoomClient } from "@/components/GameRoomClient";

export default function RoomPage({
  params,
}: {
  params: { code: string };
}) {
  return <GameRoomClient code={params.code.toUpperCase()} />;
}
