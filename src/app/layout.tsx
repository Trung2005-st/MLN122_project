import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Thặng Dư Arena | MLN122",
  description:
    "Đấu trường phân bổ tư bản multiplayer — Lợi tức & Địa tô theo C. Mác",
  openGraph: {
    title: "Thặng Dư Arena",
    description: "Game kinh tế chính trị Mác-Lênin — không phải quiz!",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className="font-body">{children}</body>
    </html>
  );
}
