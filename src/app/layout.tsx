import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Germany Software Jobs",
  description: "Personal job discovery for software/IT roles in Germany",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen">{children}</body>
    </html>
  );
}
