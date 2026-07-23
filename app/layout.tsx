import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Binh Xập Xám — Nguyen Long Casino",
  description: "Game Binh Xập Xám casino cao cấp, chơi offline cùng ba đối thủ máy.",
  manifest: "/manifest.webmanifest",
  themeColor: "#075a45",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Xập Xám",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
