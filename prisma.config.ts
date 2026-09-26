import { defineConfig, env } from "prisma/config";

// Prisma 7 không tự đọc file .env; dùng hàm có sẵn của Node thay vì cài thêm thư viện dotenv.
// Bỏ qua khi không có file (vd. máy chủ đã đặt biến môi trường sẵn).
try {
  process.loadEnvFile();
} catch {}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
