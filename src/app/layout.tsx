import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import LogoutButton from "@/components/logout-button";

export const metadata: Metadata = {
  title: "Phosub · Exam submissions",
  description: "A QR-based examination submission workflow.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body><LogoutButton />{children}</body>
    </html>
  );
}
