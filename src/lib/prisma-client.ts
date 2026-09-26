import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Tạo Prisma Client kết nối PostgreSQL. Dùng chung cho ứng dụng và script seed.
 *
 * Vì sao ép TimeZone=UTC: adapter pg gửi thời điểm dạng chuỗi không kèm múi giờ; nếu phiên kết nối
 * đang ở múi giờ khác UTC (máy cài PostgreSQL ở VN thường là Asia/Bangkok) thì giá trị lưu vào bị lệch 7 tiếng.
 */
export function createPrismaClient(connectionString = process.env.DATABASE_URL): PrismaClient {
  if (!connectionString) {
    throw new Error("Thiếu biến môi trường DATABASE_URL (xem file .env.example).");
  }
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString, options: "-c TimeZone=UTC" }),
  });
}
