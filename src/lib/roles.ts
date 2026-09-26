// Chuyển đổi vai trò giữa database (tiếng Anh, viết hoa) và kiểu nghiệp vụ dùng trong giao diện.

import type { UserRole } from "@/domain/types";
import type { UserRole as DbUserRole } from "@/generated/prisma/enums";

const toDomain: Record<DbUserRole, UserRole> = {
  DOCTOR: "bac_si",
  NURSE: "dieu_duong",
  RECEPTION: "tiep_don",
  ADMIN: "quan_tri",
};

const toDb = Object.fromEntries(Object.entries(toDomain).map(([db, domain]) => [domain, db])) as Record<UserRole, DbUserRole>;

export const toDomainRole = (role: DbUserRole): UserRole => toDomain[role];
export const toDbRole = (role: UserRole): DbUserRole => toDb[role];

export const ALL_ROLES = Object.values(toDomain);
