import type { Question, QuestionDifficulty } from "./types";

/** Câu hỏi bám sát content.md — Lợi tức & Địa tô */
export const QUESTIONS: Question[] = [
  {
    id: "q1",
    difficulty: "easy",
    timeLimitSec: 10,
    text: "Lợi tức là gì theo C. Mác?",
    options: [
      "Toàn bộ lợi nhuận bình quân",
      "Một phần LPBQ tư bản đi vay trả cho tư bản cho vay",
      "Giá trị sử dụng của tiền",
      "Thuế do nhà nước thu",
    ],
    correctIndex: 1,
  },
  {
    id: "q2",
    difficulty: "easy",
    timeLimitSec: 10,
    text: "Về thực chất, lợi tức là một phần của gì?",
    options: [
      "Giá trị sử dụng",
      "Giá cả sản phẩm",
      "Giá trị thặng dư",
      "Tiền lương",
    ],
    correctIndex: 2,
  },
  {
    id: "q3",
    difficulty: "medium",
    timeLimitSec: 15,
    text: "Đặc điểm thứ nhất của tư bản cho vay là gì?",
    options: [
      "Quyền sử dụng tách khỏi quyền sở hữu",
      "Người cho vay mất quyền sở hữu",
      "Giá cả quyết định bởi giá trị",
      "Không thể tái sử dụng",
    ],
    correctIndex: 0,
  },
  {
    id: "q4",
    difficulty: "medium",
    timeLimitSec: 15,
    text: "Tư bản cho vay là hàng hóa đặc biệt vì sao?",
    options: [
      "Người bán mất quyền sở hữu",
      "Người bán không mất quyền sở hữu, người mua chỉ được quyền sử dụng",
      "Giá cả bằng giá trị",
      "Không sinh lợi tức",
    ],
    correctIndex: 1,
  },
  {
    id: "q5",
    difficulty: "hard",
    timeLimitSec: 20,
    text: "Công thức tỷ suất lợi tức z' là:",
    options: [
      "z' = z × TBCV × 100%",
      "z' = (z / TBCV) × 100%",
      "z' = TBCV / z",
      "z' = z + TBCV",
    ],
    correctIndex: 1,
  },
  {
    id: "q6",
    difficulty: "medium",
    timeLimitSec: 15,
    text: "Tư bản cho vay vận động theo công thức nào?",
    options: ["G → W", "T → T'", "M → C", "C → M"],
    correctIndex: 1,
  },
  {
    id: "q7",
    difficulty: "easy",
    timeLimitSec: 10,
    text: "Cổ phiếu, trái phiếu được C. Mác gọi là:",
    options: [
      "Tư bản thực",
      "Tư bản giả",
      "Tư bản cố định",
      "Tư bản lưu động",
    ],
    correctIndex: 1,
  },
  {
    id: "q8",
    difficulty: "medium",
    timeLimitSec: 15,
    text: "Tỷ suất lợi tức chịu ảnh hưởng chủ yếu bởi:",
    options: [
      "Thuế và lạm phát",
      "Tỷ suất LPBQ và cung-cầu tư bản cho vay",
      "Giá vàng",
      "Dân số",
    ],
    correctIndex: 1,
  },
  {
    id: "q9",
    difficulty: "easy",
    timeLimitSec: 10,
    text: "Địa tô là gì theo C. Mác?",
    options: [
      "Toàn bộ lợi nhuận nông nghiệp",
      "Phần thặng dư sau khi trừ LPBQ trả địa chủ (R)",
      "Tiền thuê nhà xưởng",
      "Thuế đất",
    ],
    correctIndex: 1,
  },
  {
    id: "q10",
    difficulty: "medium",
    timeLimitSec: 15,
    text: "Địa tô chênh lệch I do đâu?",
    options: [
      "Thâm canh",
      "Ruộng tốt, độ màu mỡ cao, điều kiện tự nhiên thuận lợi",
      "Giá vàng tăng",
      "Lãi suất ngân hàng",
    ],
    correctIndex: 1,
  },
  {
    id: "q11",
    difficulty: "medium",
    timeLimitSec: 15,
    text: "Địa tô chênh lệch II do đâu?",
    options: [
      "Điều kiện tự nhiên",
      "Đất đã được đầu tư, thâm canh, tăng độ màu mỡ",
      "Thuế cao",
      "Cung cầu chứng khoán",
    ],
    correctIndex: 1,
  },
  {
    id: "q12",
    difficulty: "hard",
    timeLimitSec: 20,
    text: "Công thức giá cả ruộng đất:",
    options: [
      "Giá đất = LPBQ × z'",
      "Giá đất = Địa tô / Tỷ suất lợi tức NH",
      "Giá đất = TBCV + R",
      "Giá đất = Thuế × 2",
    ],
    correctIndex: 1,
  },
  {
    id: "q13",
    difficulty: "hard",
    timeLimitSec: 20,
    text: "Lợi nhuận siêu ngạch trong NN phải trả cho địa chủ dưới dạng:",
    options: ["Lợi tức", "Địa tô", "Thuế", "Cổ tức"],
    correctIndex: 1,
  },
  {
    id: "q14",
    difficulty: "easy",
    timeLimitSec: 10,
    text: "Quan hệ cho vay-đi vay hình thành do:",
    options: [
      "Nhà nước quy định",
      "Có tiền nhàn rỗi và nhu cầu vốn mở rộng SXKD",
      "Thị trường chứng khoán",
      "Thuê đất",
    ],
    correctIndex: 1,
  },
  {
    id: "q15",
    difficulty: "medium",
    timeLimitSec: 15,
    text: "Tư bản giả được giao dịch chủ yếu trên:",
    options: [
      "Thị trường lao động",
      "Thị trường chứng khoán",
      "Thị trường bất động sản",
      "Thị trường nông sản",
    ],
    correctIndex: 1,
  },
];

export function getQuestion(id: string): Question | undefined {
  return QUESTIONS.find((q) => q.id === id);
}

export function pickQuestion(difficulty?: QuestionDifficulty): Question {
  const pool = difficulty
    ? QUESTIONS.filter((q) => q.difficulty === difficulty)
    : QUESTIONS;
  return pool[Math.floor(Math.random() * pool.length)] ?? QUESTIONS[0];
}

export function toCombatView(
  q: Question,
  deadlineAt: number
): import("./types").CombatQuestionView {
  return {
    id: q.id,
    text: q.text,
    options: q.options,
    difficulty: q.difficulty,
    timeLimitSec: q.timeLimitSec,
    deadlineAt,
  };
}
