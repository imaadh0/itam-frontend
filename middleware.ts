import { NextRequest, NextResponse } from "next/server";

const TOKEN_COOKIE_NAME = "auth_token";
const PUBLIC_PATHS = ["/login"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublicPath = PUBLIC_PATHS.includes(pathname);
  const isStaticAsset =
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    /\.[\w]+$/.test(pathname);

  if (isPublicPath || isStaticAsset) {
    return NextResponse.next();
  }

  const token = request.cookies.get(TOKEN_COOKIE_NAME)?.value;

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api).*)"],
};
