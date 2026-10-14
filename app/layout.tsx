import "./globals.css";

export const metadata = { title: "会员管理", description: "简单的会员管理 Demo" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
