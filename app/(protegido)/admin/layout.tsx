import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) {
    redirect("/login");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { rol?: string };
    if (decoded.rol !== "admin") {
      redirect("/home");
    }
  } catch {
    redirect("/login");
  }

  return <>{children}</>;
}
