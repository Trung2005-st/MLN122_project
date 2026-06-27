import type { Scenario } from "./types";

/** Kịch bản bám sát content.md — Lợi tức & Địa tô tư bản chủ nghĩa */
export const SCENARIOS: Scenario[] = [
  {
    id: "idle-money",
    title: "Tiền nhàn rỗi & Quan hệ cho vay",
    narrative:
      "Trong nền kinh tế thị trường, có chủ thể có lượng tiền nhàn rỗi, trong khi chủ thể khác cần tiền mở rộng sản xuất. Quan hệ cho vay — đi vay hình thành. Người cho vay thu lợi tức; người đi vay trả lợi tức từ lợi nhuận bình quân.",
    theoryRef:
      "Lợi tức là một phần lợi nhuận bình quân mà tư bản đi vay trả cho tư bản cho vay — thực chất là một phần giá trị thặng dư.",
    market: {
      avgProfitRate: 18,
      baseInterestRate: 8,
      loanSupplyDemand: -0.6,
      landFertility: "medium",
      landInvestment: false,
      bankDepositRate: 5,
    },
    optimalHint: "lend",
  },
  {
    id: "loan-capital-special",
    title: "Tư bản cho vay — Hàng hóa đặc biệt",
    narrative:
      "Tư bản cho vay: người bán không mất quyền sở hữu, người mua chỉ được quyền sử dụng. Giá cả quyết định bởi giá trị sử dụng — khả năng thu lợi nhuận bình quân, thấp hơn nhiều so với giá trị.",
    theoryRef:
      "Quyền sử dụng tách khỏi quyền sở hữu. TBCV được bảo tồn giá trị, thậm chí tăng thêm sau khi cho vay.",
    market: {
      avgProfitRate: 16,
      baseInterestRate: 7,
      loanSupplyDemand: 0.3,
      landFertility: "medium",
      landInvestment: false,
      bankDepositRate: 5,
    },
    optimalHint: "borrow",
  },
  {
    id: "tt-formula",
    title: "Ảo tưởng T → T'",
    narrative:
      "Tư bản cho vay vận động theo công thức T - T', tạo ảo tưởng tiền đẻ ra tiền. Tỷ suất lợi tức z' = (z/TBCV) × 100%, chịu ảnh hưởng tỷ suất lợi nhuận bình quân và cung cầu tư bản cho vay.",
    theoryRef:
      "Hình thái tư bản phiến diện nhất, song cũng được sùng bái nhất — dễ mắc bẫy ảo tưởng.",
    market: {
      avgProfitRate: 20,
      baseInterestRate: 10,
      loanSupplyDemand: 0,
      landFertility: "low",
      landInvestment: false,
      bankDepositRate: 6,
    },
    optimalHint: "lend",
  },
  {
    id: "fictitious-capital",
    title: "Tư bản giả & Thị trường chứng khoán",
    narrative:
      "Công ty cổ phần phát hành cổ phiếu, trái phiếu — C. Mác gọi là tư bản giả vì giao dịch tách biệt khỏi sản xuất thực. Chứng quyền cũng được mua bán, đem thu nhập cho người sở hữu.",
    theoryRef:
      "Thị trường chứng khoán phục vụ quan hệ giao dịch mua bán chứng khoán — rủi ro cao, biến động mạnh.",
    market: {
      avgProfitRate: 15,
      baseInterestRate: 9,
      loanSupplyDemand: 0.5,
      landFertility: "medium",
      landInvestment: false,
      bankDepositRate: 5,
    },
    optimalHint: "fictitious",
  },
  {
    id: "land-rent-diff1",
    title: "Địa tô chênh lệch I",
    narrative:
      "Nhà tư bản kinh doanh nông nghiệp thu lợi nhuận bình quân nhưng phải trả tiền cho địa chủ. Địa tô chênh lệch I: địa chủ thu được do ruộng đất tốt, độ màu mỡ cao, điều kiện tự nhiên thuận lợi.",
    theoryRef:
      "Lợi nhuận siêu ngạch dôi ra ngoài lPBQ phải trả cho địa chủ dưới dạng địa tô (R).",
    market: {
      avgProfitRate: 14,
      baseInterestRate: 7,
      loanSupplyDemand: -0.2,
      landFertility: "high",
      landInvestment: false,
      bankDepositRate: 5,
    },
    optimalHint: "land",
  },
  {
    id: "land-rent-diff2",
    title: "Địa tô chênh lệch II & Tuyệt đối",
    narrative:
      "Địa tô chênh lệch II: đất đã được đầu tư, thâm canh, tăng độ màu mỡ. Địa tô tuyệt đối: lợi nhuận siêu ngạch = chênh lệch giá trị nông sản và giá cả sản xuất chung.",
    theoryRef:
      "Giá cả đất đai = Địa tô / Tỷ suất lợi tức nhận gửi ngân hàng.",
    market: {
      avgProfitRate: 17,
      baseInterestRate: 6,
      loanSupplyDemand: -0.4,
      landFertility: "high",
      landInvestment: true,
      bankDepositRate: 4,
    },
    optimalHint: "land",
  },
];

export function getScenario(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}

export function pickScenarioIds(count: number): string[] {
  const shuffled = [...SCENARIOS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map((s) => s.id);
}
