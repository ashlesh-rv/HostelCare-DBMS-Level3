import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HostelCare | Room Allocation & Complaints",
  description: "Hostel room allocation and complaint management system",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
