// Chặn SƠ BỘ: chưa có cookie phiên thì chuyển về trang đăng nhập.
// Không truy vấn database ở đây (proxy chạy ở mọi request, kể cả prefetch);
// kiểm tra phiên và quyền thật sự nằm trong src/lib/auth/dal.ts ở từng trang và server action.

import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/session-cookie";

const PUBLIC_PATHS = ["/dang-nhap"];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }
  if (!request.cookies.has(SESSION_COOKIE)) {
    const url = new URL("/dang-nhap", request.url);
    if (pathname !== "/") url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Bỏ qua file tĩnh và ảnh để không chặn CSS/JS/font của trang đăng nhập.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)"],
};
