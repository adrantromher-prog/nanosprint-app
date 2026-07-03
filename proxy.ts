import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import pool from "@/lib/db";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const excludePatterns = [
    "/_next/",
    "/api/",
    "/login",
    "/registro",
    "/mantenimiento",
    "/admin",
    "/favicon.ico",
    "/fondos/",

    "/musica/",
    "/transicion.png",
  ];

  for (const pattern of excludePatterns) {
    if (pathname.startsWith(pattern)) return NextResponse.next();
  }

  // la raíz y login no se bloquean
  if (pathname === "/") return NextResponse.next();

  // si el usuario es admin, saltea mantenimiento
  const token = request.cookies.get("token")?.value;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { rol?: string };
      if (decoded.rol === "admin") return NextResponse.next();
    } catch {}
  }

  try {
    const { rows } = await pool.query(
      "SELECT valor FROM configuracion WHERE clave = 'mantenimiento'"
    );
    if (rows[0]?.valor === "true") {
      return NextResponse.redirect(new URL("/mantenimiento", request.url));
    }
  } catch {
    // si falla la BD, permitir acceso normal
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|admin).*)",
  ],
};
