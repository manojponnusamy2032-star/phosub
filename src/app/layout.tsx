import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Phosub · Exam submissions",
  description: "A QR-based examination submission workflow.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
