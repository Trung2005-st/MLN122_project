# Thặng Dư Open World — MLN122

Game web **thế giới mở multiplayer** về **Lợi tức** và **Địa tô tư bản chủ nghĩa** (C. Mác). Đánh quái $, PvP quiz, hộp quà rơi từ trời — deploy trên Vercel.

## Cách chơi

1. Chọn **class nhân vật** → tạo/vào phòng (2–8 người)
2. Host bấm **Mở thế giới** — trận kéo dài **5 phút**
3. **WASD** di chuyển · click quái **$** hoặc **E** gần quái để đánh
4. Trả lời câu hỏi từ `content.md` (10–20s tùy độ khó) — đúng cộng điểm, sai/trốn bị trừ 50% thưởng
5. **PvP**: chạm người chơi → đối phương chấp nhận/từ chối → cả hai trả lời, ai đúng nhanh hơn thắng
6. Sau **30s** có **1–3 hộp quà** rơi xuống map (buff/debuff/thẻ đặc biệt)
7. Còn **30s** cuối → cảnh báo → **BXH** kết thúc

## Tech stack

- **Next.js 14** (App Router) + **Phaser 3** (map 2D)
- **Upstash Redis** — phòng game, đồng bộ, bảng xếp hạng
- Polling 1s + Redis lock

## Chạy local

```bash
npm install
cp .env.example .env.local
# Điền UPSTASH_REDIS_REST_URL và UPSTASH_REDIS_REST_TOKEN
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000)

## Deploy Vercel

1. Push repo lên GitHub
2. Import project trên [vercel.com](https://vercel.com)
3. Thêm env: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
4. Deploy

## Nội dung lý thuyết

Nguồn: `content.md` — câu hỏi trắc nghiệm về lợi tức, tư bản giả, địa tô, chênh lệch I/II.

## Cấu trúc chính

```
src/lib/world-engine.ts   # Quái, quà, combat PvE/PvP
src/lib/room-store.ts     # Redis + actions
src/components/rpg/       # Phaser map, HUD, combat modal
```
