import type { AllocationBucket } from "./types";

export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 640;

export interface ZoneConfig {
  id: AllocationBucket;
  x: number;
  y: number;
  label: string;
  color: number;
}

export const WORLD_ZONES: ZoneConfig[] = [
  { id: "lend", x: 480, y: 95, label: "Ngân hàng", color: 0xf0b429 },
  { id: "fictitious", x: 130, y: 320, label: "Sàn CK", color: 0xf81ce5 },
  { id: "borrow", x: 830, y: 320, label: "Nhà máy", color: 0x0070f3 },
  { id: "land", x: 480, y: 545, label: "Đồng ruộng", color: 0x50e3a4 },
];

export const HUB_POS = { x: 480, y: 320 };

export const PLAYER_TINTS = [
  0xffffff,
  0x88ccff,
  0xff8888,
  0x88ff88,
  0xffcc88,
  0xcc88ff,
  0xffff88,
  0xff88ff,
];

export const FRAME = { w: 32, h: 48 };
