"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type MovimientosRemates = {
  totalRemates: number;
  totalPujas: number;
  casa: number;
  aporteJackpot: number;
  comisionReferidos: number;
  gananciaFinal: number;
};

export default function AdminMovimientos() {
  const router = useRouter();
  const [remates, setRemates] = useState<MovimientosRemates | null>(null);
  const [cargando, setCargando] = useState(false);

  const cargar = async () => {
    setCargando(true);
    try {
      const res = await fetch("/api/admin/movimientos/remates");
      const data = await res.json();
      if (data.ok) setRemates(data);
    } catch {}
    setCargando(false);
  };

  return (
    <main className="min-h-screen p-6 text-white">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => router.push("/admin")}
          className="px-4 py-2 rounded-xl bg-gradient-to-b from-[#003344] to-[#0077AA] border border-cyan-300/70 text-white font-bold text-sm shadow-[0_0_18px_rgba(0,255,255,0.5)] hover:shadow-[0_0_28px_rgba(0,255,255,0.9)] active:scale-95 transition-all">
          ← Volver
        </button>
        <h1 className="text-3xl font-extrabold drop-shadow-[0_0_12px_rgba(0,255,255,0.6)]">Movimientos</h1>
        <div className="w-20" />
      </div>

      {!remates && (
        <div className="flex flex-col items-center mt-16">
          <button onClick={cargar} disabled={cargando}
            className="w-80 py-6 rounded-2xl text-xl font-bold bg-gradient-to-b from-[#003344] to-[#0077AA] border border-cyan-300/70 shadow-[0_0_22px_rgba(0,255,255,0.5)] hover:shadow-[0_0_35px_rgba(0,255,255,0.9)] active:scale-95 transition-all disabled:opacity-50">
            {cargando ? "Cargando..." : "Ver Remates"}
          </button>
        </div>
      )}

      {remates && (
        <div className="max-w-lg mx-auto mt-8 space-y-4">
          <div className="bg-gray-900/70 border border-gray-700 rounded-2xl p-6 shadow-xl">
            <h2 className="text-2xl font-bold text-cyan-300 mb-4">Remates</h2>
            <div className="space-y-3 text-lg">
              <div className="flex justify-between">
                <span className="text-gray-400">Suma total de remates</span>
                <span className="font-bold">Bs. {remates.totalPujas.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Ganancia de la casa (20%)</span>
                <span className="font-bold text-green-400">Bs. {remates.casa.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">% que va al jackpot (25% de la casa)</span>
                <span className="font-bold text-yellow-300">Bs. {remates.aporteJackpot.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">% que va a referidos (25% de la casa)</span>
                <span className="font-bold text-purple-300">Bs. {remates.comisionReferidos.toFixed(2)}</span>
              </div>
              <div className="border-t border-gray-700 pt-3 flex justify-between">
                <span className="text-gray-200 font-bold">Ganancia final de la casa</span>
                <span className="font-bold text-green-400 text-xl">Bs. {remates.gananciaFinal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
