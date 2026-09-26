import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import { AppShell } from "@/components/layout/app-shell";
import { TopBar } from "@/components/layout/top-bar";
import { clinicConfig } from "@/lib/clinic-config";
import "./globals.css";

// Font được next/font tải về lúc build và phục vụ từ chính máy chủ,
// nên trình duyệt nhân viên không phải gọi ra Google Fonts.
const beVietnam = Be_Vietnam_Pro({
  variable: "--font-be-vietnam",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: `${clinicConfig.name} – Nội bộ`,
  description: "Website nội bộ quản lý bệnh nhân, lịch hẹn và đơn thuốc.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={`${beVietnam.variable} antialiased`}>
      <body className="font-sans">
        <AppShell clinicName={clinicConfig.name} topBar={<TopBar />}>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
