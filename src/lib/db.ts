import type { PrismaClient } from "@/generated/prisma/client";
import { createPrismaClient } from "@/lib/prisma-client";

// Khi chạy "npm run dev", Next nạp lại module mỗi lần sửa code; giữ một client duy nhất trên globalThis
// để không mở thêm kết nối PostgreSQL sau mỗi lần lưu file.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
