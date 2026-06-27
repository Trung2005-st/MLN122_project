# Thặng Dư Arena — MLN122

Game web **multiplayer realtime** về **Lợi tức** và **Địa tô tư bản chủ nghĩa** (C. Mác), deploy trên Vercel.

> **Không phải quiz/Kahoot.** Cơ chế: phân bổ vốn bí mật → hé lộ đồng thời → thị trường tính điểm theo lý thuyết.

## Cách chơi

1. Tạo phòng hoặc nhập mã phòng (2–8 người)
2. Host bấm **Bắt đầu đấu** — 5 vòng kinh tế
3. Mỗi vòng: đọc kịch bản → phân bổ 100 điểm vào 4 kênh tư bản
4. Cùng lúc hé lộ chiến thuật → hệ thống tính thặng dư (z', địa tô R, T→T'...)
5. Sự kiện bất ngờ, bảng xếp hạng lưu trên Redis

## Tech stack

- **Next.js 14** (App Router) — deploy Vercel
- **Upstash Redis** — phòng game, đồng bộ người chơi, bảng xếp hạng (không mock)
- Polling 1.2s + Redis lock — xử lý truy cập đồng thời

## Chạy local

```bash
npm install
cp .env.example .env.local
# Điền UPSTASH_REDIS_REST_URL và UPSTASH_REDIS_REST_TOKEN
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000)

### Tạo Upstash Redis (miễn phí)

1. Vào [console.upstash.com](https://console.upstash.com)
2. Create Database → chọn region gần Vercel
3. Copy **REST URL** và **REST Token** vào `.env.local`

## Deploy Vercel

1. Push repo lên GitHub
2. [vercel.com](https://vercel.com) → **Add New Project** → Import repo
3. Thêm Environment Variables:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
4. Deploy

## Nội dung lý thuyết

Nguồn: `content.md` — Lợi tức, tư bản cho vay, tư bản giả, địa tô chênh lệch I/II, địa tô tuyệt đối, công thức giá đất.

## Cấu trúc

```
src/
├── app/           # Pages + API routes
├── components/    # UI game
└── lib/
    ├── scenarios.ts    # Kịch bản từ content.md
    ├── game-engine.ts  # Công thức tính điểm
    └── room-store.ts   # Redis multiplayer
```
