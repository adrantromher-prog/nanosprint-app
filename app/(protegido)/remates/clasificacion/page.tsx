"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Clasificacion() {
  const [clasificacion, setClasificacion] = useState<{ sobrenombre: string; puntos: number }[]>([]);
  const router = useRouter();

  useEffect(() => {
    const fetchClasificacion = async () => {
      try {
        const res = await fetch("/api/remates/clasificacion");
        const data = await res.json();
        if (data.ok) setClasificacion(data.clasificacion);
      } catch {}
    };
    fetchClasificacion();
    const intervalo = setInterval(fetchClasificacion, 5000);
    return () => clearInterval(intervalo);
  }, []);

  return (
    <main className="relative h-screen w-full text-white overflow-hidden">

      <video
        src="/fondos/fondoapuesta.mp4"
        autoPlay loop muted playsInline
        className="absolute inset-0 w-full h-full object-cover scale-[1.2] brightness-[0.75] contrast-[1.2] saturate-[1.2] blur-[1.5px]"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-black/80" />

      <div className="relative z-10 flex flex-col h-full p-4 gap-4">

        <div className="flex items-center justify-between flex-shrink-0">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 rounded-xl text-sm font-bold bg-gradient-to-b from-[#003344] to-[#0077AA] border border-cyan-300/70 shadow-[0_0_14px_rgba(0,255,255,0.4)] hover:shadow-[0_0_22px_rgba(0,255,255,0.8)] active:scale-95 transition-all duration-300"
          >
            ← Volver
          </button>
          <h1 className="text-2xl font-extrabold text-yellow-300 drop-shadow-[0_0_10px_rgba(255,200,0,0.5)]">
            Clasificación
          </h1>
          <div className="w-20" />
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="max-w-lg mx-auto space-y-2">
            {clasificacion.length === 0 ? (
              <p className="text-gray-500 text-center mt-10">Aún no hay ganadores.</p>
            ) : (
              clasificacion.map((u, i) => (
                <div
                  key={u.sobrenombre}
                  className="flex items-center gap-4 px-4 py-3 rounded-xl bg-gray-900/70 border border-gray-700"
                >
                  <span className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm ${
                    i === 0 ? "bg-yellow-500/30 text-yellow-300 border border-yellow-400/50" :
                    i === 1 ? "bg-gray-400/20 text-gray-300 border border-gray-400/40" :
                    i === 2 ? "bg-amber-700/20 text-amber-400 border border-amber-600/40" :
                    "bg-white/5 text-gray-500 border border-white/10"
                  }`}>
                    {i + 1}
                  </span>
                  <span className="flex-1 font-semibold text-white">@{u.sobrenombre}</span>
                  <span className="font-bold text-yellow-300">{u.puntos} pts</span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </main>
  );
}
