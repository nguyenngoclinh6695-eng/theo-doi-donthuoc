import type { NextConfig } from "next";

// Tên miền nhân viên dùng để mở website khi chạy thật (vd. "phongkham.tail1234.ts.net" của Tailscale).
// Next.js chặn server action gửi từ tên miền lạ để chống CSRF; khai báo ở đây để tên miền qua VPN được chấp nhận.
const appHost = process.env.APP_HOST?.trim();

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // playwright-core điều khiển trình duyệt thật để in PDF – chạy trực tiếp từ node_modules, không đóng gói.
  serverExternalPackages: ["playwright-core"],
  experimental: {
    serverActions: {
      allowedOrigins: appHost ? [appHost] : [],
      // Bản scan đơn thuốc tải lên qua server action (tối đa 10 MB, kiểm tra lại ở máy chủ).
      bodySizeLimit: "11mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Không cho trang khác nhúng website vào khung (chống clickjacking).
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Không gửi đường dẫn (có thể chứa mã hồ sơ) sang trang khác khi bấm liên kết ra ngoài.
          // Dùng "same-origin" chứ KHÔNG dùng "no-referrer": với "no-referrer" trình duyệt gửi "Origin: null" khi POST,
          // Next.js coi server action là giả mạo (CSRF) và từ chối – lỗi chỉ lộ ra khi chạy sau proxy (Tailscale).
          { key: "Referrer-Policy", value: "same-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
