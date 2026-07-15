import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const excludePatterns = [
    "/_next/",
    "/api/",
    "/login",
    "/registro",
    "/admin",
    "/favicon.ico",
    "/fondos/",
    "/carreras-virtuales/",
    "/transicion.png",
  ];

  for (const pattern of excludePatterns) {
    if (pathname.startsWith(pattern)) return NextResponse.next();
  }

  if (pathname === "/") return NextResponse.next();

  const token = request.cookies.get("token")?.value;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { rol?: string };
      if (decoded.rol === "admin") return NextResponse.next();
    } catch {}
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|admin).*)",
  ],
};
