import type { CharacterClass } from "./types";

export interface CharacterDef {
  id: CharacterClass;
  title: string;
  subtitle: string;
  emoji: string;
  color: string;
  glow: string;
  lore: string;
}

export const CHARACTERS: CharacterDef[] = [
  {
    id: "lender",
    title: "Tư bản Cho Vay",
    subtitle: "Chủ tiền nhàn rỗi",
    emoji: "🏦",
    color: "#f0b429",
    glow: "rgba(240,180,41,0.45)",
    lore: "Sở hữu tư bản, cho người khác mượn và thu lợi tức — một phần giá trị thặng dư.",
  },
  {
    id: "borrower",
    title: "Tư bản Đi Vay",
    subtitle: "Nhà công nghiệp",
    emoji: "🏭",
    color: "#0070f3",
    glow: "rgba(0,112,243,0.45)",
    lore: "Đi vay để mở rộng sản xuất, trả lợi tức từ lợi nhuận bình quân thu được.",
  },
  {
    id: "farmer",
    title: "TB Kinh Doanh NN",
    subtitle: "Thuê đất, trả địa tô",
    emoji: "🌾",
    color: "#50e3a4",
    glow: "rgba(80,227,164,0.4)",
    lore: "Thu lợi nhuận siêu ngạch nhưng phải trả địa tô R cho địa chủ.",
  },
  {
    id: "speculator",
    title: "Nhà Đầu Cơ",
    subtitle: "Tư bản giả · T→T'",
    emoji: "📈",
    color: "#f81ce5",
    glow: "rgba(248,28,229,0.35)",
    lore: "Giao dịch cổ phiếu, trái phiếu, chứng quyền — ảo tưởng tiền đẻ ra tiền.",
  },
];

export function getCharacter(id?: CharacterClass): CharacterDef {
  return CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];
}
