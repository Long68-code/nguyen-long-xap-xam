import type { Metadata, Viewport } from "next";
import "./globals.css";

const publicBase = process.env.GITHUB_PAGES === "true" ? "/nguyen-long-xap-xam" : "";

export const metadata: Metadata = {
  title: "Binh Xập Xám — Nguyen Long Casino",
  description: "Game Binh Xập Xám casino cao cấp, chơi offline cùng ba đối thủ máy.",
  manifest: `${publicBase}/manifest.webmanifest`,
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Xập Xám",
  },
  icons: {
    icon: `${publicBase}/favicon.svg`,
    shortcut: `${publicBase}/favicon.svg`,
  },
};

export const viewport: Viewport = {
  themeColor: "#075a45",
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
