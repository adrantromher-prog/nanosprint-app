import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { redirect } from "next/navigation";
import MantenimientoOverlay from "./MantenimientoOverlay";
import BackgroundMusic from "./BackgroundMusic";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // ⭐ cookies() ahora es async → hay que hacer await
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) {
    redirect("/login");
  }

  try {
    jwt.verify(token, process.env.JWT_SECRET!);
  } catch (err) {
    redirect("/login");
  }

  return (
    <MantenimientoOverlay>
      <BackgroundMusic>{children}</BackgroundMusic>
    </MantenimientoOverlay>
  );
}
