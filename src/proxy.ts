import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isPreview = pathname === "/" && request.nextUrl.searchParams.has("step");
  const isPublic = pathname === "/login" || pathname === "/signup" || pathname.startsWith("/login/") || isPreview;

  // Supabase auth cookie (sb-<projectRef>-auth-token)
  const hasSession = request.cookies.getAll().some((c) =>
    c.name.startsWith("sb-") && c.name.endsWith("-auth-token")
  );

  if (!hasSession && !isPublic) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (hasSession && isPublic && !isPreview) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
