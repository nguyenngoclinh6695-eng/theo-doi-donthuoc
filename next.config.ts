import type { NextConfig } from "next";

// Tên miền nhân viên dùng để mở website khi chạy thật (vd. "phongkham.tail1234.ts.net" của Tailscale).
// Next.js chặn server action gửi từ tên miền lạ để chống CSRF; khai báo ở đây để tên miền qua VPN được chấp nhận.
const appHost = process.env.APP_HOST?.trim();

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    serverActions: {
      allowedOrigins: appHost ? [appHost] : [],
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
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
