import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "工程專案管理系統",
  description: "Kanban + Gantt 專案管理系統",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <body>{children}</body>
    </html>
  );
}
