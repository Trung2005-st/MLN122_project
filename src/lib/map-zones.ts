import type { AllocationBucket } from "./types";

export interface MapZone {
  id: AllocationBucket;
  name: string;
  building: string;
  description: string;
  /** % position on map canvas */
  x: number;
  y: number;
  color: string;
  gradient: string;
  icon: string;
}

export const MAP_ZONES: MapZone[] = [
  {
    id: "lend",
    name: "Khu Ngân Hành",
    building: "Ngân hàng Cho vay",
    description: "TBCV · z' = (z/TBCV)×100%",
    x: 50,
    y: 14,
    color: "#f0b429",
    gradient: "from-amber-500/30 to-yellow-600/10",
    icon: "🏦",
  },
  {
    id: "fictitious",
    name: "Sàn Chứng Khoán",
    building: "Tư bản giả · T→T'",
    description: "Cổ phiếu · Trái phiếu · Chứng quyền",
    x: 14,
    y: 50,
    color: "#f81ce5",
    gradient: "from-fuchsia-500/25 to-purple-600/10",
    icon: "📈",
  },
  {
    id: "borrow",
    name: "Khu Công Nghiệp",
    building: "Nhà máy · Tư bản đi vay",
    description: "Sản xuất · LPBQ · Trả lợi tức",
    x: 86,
    y: 50,
    color: "#0070f3",
    gradient: "from-blue-500/30 to-cyan-600/10",
    icon: "🏭",
  },
  {
    id: "land",
    name: "Đồng Ruộng",
    building: "Địa tô · Ruộng đất",
    description: "Địa tô chênh lệch I/II · R",
    x: 50,
    y: 86,
    color: "#50e3a4",
    gradient: "from-emerald-500/30 to-green-600/10",
    icon: "🌾",
  },
];

export const HUB = { x: 50, y: 50, name: "Quảng trường Thị trường" };

export function getZone(id: AllocationBucket): MapZone {
  return MAP_ZONES.find((z) => z.id === id)!;
}

/** Dominant zone from allocation for avatar placement */
export function dominantZone(
  alloc: Record<AllocationBucket, number>
): AllocationBucket {
  let max = 0;
  let zone: AllocationBucket = "lend";
  for (const z of MAP_ZONES) {
    if (alloc[z.id] > max) {
      max = alloc[z.id];
      zone = z.id;
    }
  }
  return zone;
}

/** Interpolate position between hub and zone based on investment % */
export function avatarPosition(
  alloc: Record<AllocationBucket, number> | undefined,
  fallback: AllocationBucket = "lend"
): { x: number; y: number } {
  if (!alloc) return HUB;
  const zone = dominantZone(alloc);
  const z = getZone(zone);
  const amount = alloc[zone] / 100;
  const t = 0.25 + amount * 0.65;
  return {
    x: HUB.x + (z.x - HUB.x) * t,
    y: HUB.y + (z.y - HUB.y) * t,
  };
}
