# Thặng Dư Chronicles — MLN122 RPG

Game web **RPG map 2D multiplayer** về **Lợi tức** và **Địa tô tư bản chủ nghĩa** (C. Mác), deploy trên Vercel.

> **Không phải quiz/Kahoot.** Chọn nhân vật → khám phá bản đồ 4 vùng → phân bổ vốn bí mật → nhân vật di chuyển → đua thặng dư.

## Cách chơi

1. Chọn **class nhân vật** (Tư bản cho vay, Đi vay, Nông nghiệp, Đầu cơ T→T')
2. Tạo/vào phòng (2–8 người) trên **bản đồ 2D**
3. Mỗi vòng: NPC C. Mác giao nhiệm vụ → click vùng trên map để đặt vốn (100 điểm)
4. Nhân vật di chuyển theo chiến lược → hé lộ đồng thời → tính thặng dư
5. Sự kiện bất ngờ, bảng xếp hạng Redis

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
