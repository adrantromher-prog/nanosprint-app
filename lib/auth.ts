import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

function checkOrigin(req?: Request): NextResponse | null {
  if (!req) return null;
  const method = req.method;
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) return null;
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  const host = req.headers.get("host");
  if (!host) return null;
  if (!origin && !referer) return null;
  if (origin && !origin.includes(host)) {
    return NextResponse.json({ error: "Origen no válido" }, { status: 403 });
  }
  if (referer && !referer.includes(host)) {
    return NextResponse.json({ error: "Origen no válido" }, { status: 403 });
  }
  return null;
}

export async function requireAdmin(req?: Request): Promise<NextResponse | null> {
  const originErr = checkOrigin(req);
  if (originErr) return originErr;

  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: number; rol: string };
    if (decoded.rol !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    return null;
  } catch {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }
}

export async function requireUser(req?: Request): Promise<{ id: number } | NextResponse> {
  const originErr = checkOrigin(req);
  if (originErr) return originErr;

  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: number };
    return { id: decoded.id };
  } catch {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }
}
