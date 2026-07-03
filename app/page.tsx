"use client";

import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  return (
    <main className="relative h-screen w-full overflow-hidden">

      {/* VIDEO DE FONDO */}
      <video
        src="/fondos/fondoinicio.mp4"
        autoPlay
        loop
        muted
        playsInline
        className="absolute top-0 left-0 w-full h-full object-cover"
      />

      {/* CONTENIDO */}
      <div className="relative z-10 flex flex-col items-center justify-end h-full pb-7">

        {/* BOTÓN NEÓN FUTURISTA */}
        <button
          onClick={() => router.push("/login")}
          className="
            px-12 py-4 
            text-xl font-bold 
            text-white 
            rounded-xl 
            border-2 border-cyan-400 
            shadow-[0_0_15px_rgba(0,255,255,0.7)] 
            hover:shadow-[0_0_25px_rgba(0,255,255,1)] 
            hover:border-cyan-300 
            transition 
            duration-300 
            backdrop-blur-sm 
            bg-white/10
            active:scale-95
          "
        >
          Entrar
        </button>
      </div>
    </main>
  );
}
