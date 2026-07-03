import { NextResponse } from "next/server";

export async function GET() {
  const res = NextResponse.json({ message: "Logout exitoso" });

  // ⭐ Borrar la cookie
  res.cookies.set("token", "", {
    httpOnly: true,
    secure: false,
    path: "/",
    maxAge: 0,
  });

  return res;
}
