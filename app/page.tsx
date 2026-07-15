"use client";

import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  return (
    <main className="relative h-screen w-full overflow-hidden">

      {/* FONDO */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/fondos/entrada.png')" }}
      />

      {/* CONTENIDO */}
      <div className="relative z-10 flex flex-col items-center justify-end h-full pb-24">

        {/* BOTÓN */}
        <button
          onClick={() => router.push("/login")}
          className="
            px-12 py-4
            text-xl font-bold
            text-white
            rounded-xl
            border-2 border-white/30
            shadow-[0_0_15px_rgba(255,255,255,0.15)]
            hover:shadow-[0_0_25px_rgba(255,255,255,0.3)]
            hover:border-white/50
            transition duration-300
            backdrop-blur-sm
            bg-black/40
            active:scale-95
          "
        >
          Entrar
        </button>
      </div>
    </main>
  );
}
