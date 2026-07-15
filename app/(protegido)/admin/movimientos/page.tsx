"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type RematesItem = {
  dia?: string; mes?: string; total_pujas: number; casa: number; ganancia_final: number;
};

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
  const [remates, setRemates] = useState<any>(null);
  const [cargando, setCargando] = useState(false);
  const [virtuales, setVirtuales] = useState<any>(null);
  const [cargandoV, setCargandoV] = useState(false);
  const [vista, setVista] = useState("diario");
  const [vistaR, setVistaR] = useState("diario");

  const cargar = async () => {
    setCargando(true);
    try {
      const res = await fetch("/api/admin/movimientos/remates");
      const data = await res.json();
      if (data.ok) setRemates(data);
    } catch {}
    setCargando(false);
  };

  const cargarVirtuales = async () => {
    setCargandoV(true);
    try {
      const res = await fetch("/api/admin/movimientos/virtuales");
      const data = await res.json();
      if (data.ok) setVirtuales(data);
    } catch {}
    setCargandoV(false);
  };

  return (
    <main className="min-h-screen p-4 md:p-6 text-white">
      <div className="flex items-center justify-between mb-6 gap-3">
        <button onClick={() => router.push("/admin")}
          className="px-4 py-2 rounded-xl bg-gradient-to-b from-[#003344] to-[#0077AA] border border-cyan-300/70 text-white font-bold text-sm shadow-[0_0_18px_rgba(0,255,255,0.5)] hover:shadow-[0_0_28px_rgba(0,255,255,0.9)] active:scale-95 transition-all">
          ← Volver
        </button>
        <h1 className="text-xl md:text-3xl font-extrabold drop-shadow-[0_0_12px_rgba(0,255,255,0.6)] text-center">Movimientos</h1>
        <div className="w-14 md:w-20" />
      </div>

      {!virtuales && !remates && (
        <div className="flex flex-col items-center mt-8 md:mt-16 gap-4">
          <button onClick={cargarVirtuales} disabled={cargandoV}
            className="w-full max-w-xs py-4 md:py-6 rounded-2xl text-sm md:text-xl font-bold bg-gradient-to-b from-emerald-700 to-emerald-900 border border-emerald-400/30 shadow-[0_0_22px_rgba(4,120,87,0.3)] hover:shadow-[0_0_35px_rgba(4,120,87,0.6)] active:scale-95 transition-all disabled:opacity-50">
            {cargandoV ? "Cargando..." : "Ver Virtuales"}
          </button>
          <button onClick={cargar} disabled={cargando}
            className="w-full max-w-xs py-4 md:py-6 rounded-2xl text-sm md:text-xl font-bold bg-gradient-to-b from-[#003344] to-[#0077AA] border border-cyan-300/70 shadow-[0_0_22px_rgba(0,255,255,0.5)] hover:shadow-[0_0_35px_rgba(0,255,255,0.9)] active:scale-95 transition-all disabled:opacity-50">
            {cargando ? "Cargando..." : "Ver Remates"}
          </button>
        </div>
      )}

      {virtuales && !remates && (
        <div className="max-w-4xl mx-auto mt-6 md:mt-8 space-y-4">
          <div className="bg-gray-900/70 border border-gray-700 rounded-2xl p-4 md:p-6 shadow-xl">
            <h2 className="text-xl md:text-2xl font-bold text-emerald-300 mb-4">Carreras Virtuales</h2>
            <div className="flex gap-2 mb-4">
              <button onClick={() => setVista('diario')} className={'px-4 py-2 rounded-lg text-xs font-semibold transition-all ' + (vista === 'diario' ? 'bg-emerald-500/20 border border-emerald-400/40 text-emerald-300' : 'bg-white/5 border border-white/10 text-white/50 hover:bg-white/10')}>Diario</button>
              <button onClick={() => setVista('mensual')} className={'px-4 py-2 rounded-lg text-xs font-semibold transition-all ' + (vista === 'mensual' ? 'bg-emerald-500/20 border border-emerald-400/40 text-emerald-300' : 'bg-white/5 border border-white/10 text-white/50 hover:bg-white/10')}>Mensual</button>
            </div>
            <div className='overflow-x-auto'>
              <table className='w-full text-xs md:text-sm'>
                <thead>
                  <tr className='text-gray-400 border-b border-gray-700'>
                    <th className='text-left py-2 pr-2'>Fecha</th>
                    <th className='text-right px-2'>Apuestas</th>
                    <th className='text-right px-2'>Monto</th>
                    <th className='text-right px-2'>Premios</th>
                    <th className='text-right pl-2'>Ganancia</th>
                  </tr>
                </thead>
                <tbody>
                  {(vista === 'diario' ? virtuales.diario : virtuales.mensual).map((r: any, i: number) => {
                    const g = Number(r.ganancia_casa);
                    return (
                      <tr key={i} className='border-b border-gray-800/50 hover:bg-white/[0.02]'>
                        <td className='py-2 pr-2 text-white/70 font-mono'>{vista === 'diario' ? (r.dia||'').substring(0,10) : (r.mes||'').substring(0,7)}</td>
                        <td className='text-right px-2 text-white/80'>{r.total_apuestas}</td>
                        <td className='text-right px-2 text-white/80'>Bs. {Number(r.monto_apostado).toFixed(2)}</td>
                        <td className='text-right px-2 text-red-400'>- Bs. {Number(r.premios_pagados).toFixed(2)}</td>
                        <td className={'text-right pl-2 font-bold ' + (g >= 0 ? 'text-green-400' : 'text-red-400')}>Bs. {g.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <button onClick={() => { setVirtuales(null); setVista('diario'); }}
            className='w-full py-3 rounded-xl text-sm font-semibold bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 active:scale-[0.98] transition-all'>
            ← Volver
          </button>
        </div>
      )}

      {remates && (
        <div className="max-w-4xl mx-auto mt-6 md:mt-8 space-y-4">
          <div className="bg-gray-900/70 border border-gray-700 rounded-2xl p-4 md:p-6 shadow-xl">
            <h2 className="text-xl md:text-2xl font-bold text-cyan-300 mb-4">Remates</h2>
            <div className="flex gap-2 mb-4">
              <button onClick={() => setVistaR("diario")} className={"px-4 py-2 rounded-lg text-xs font-semibold transition-all " + (vistaR === "diario" ? "bg-cyan-500/20 border border-cyan-400/40 text-cyan-300" : "bg-white/5 border border-white/10 text-white/50 hover:bg-white/10")}>Diario</button>
              <button onClick={() => setVistaR("mensual")} className={"px-4 py-2 rounded-lg text-xs font-semibold transition-all " + (vistaR === "mensual" ? "bg-cyan-500/20 border border-cyan-400/40 text-cyan-300" : "bg-white/5 border border-white/10 text-white/50 hover:bg-white/10")}>Mensual</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs md:text-sm">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-700">
                    <th className="text-left py-2 pr-2">Fecha</th>
                    <th className="text-right px-2">Total pujas</th>
                    <th className="text-right px-2">Casa (20%)</th>
                    <th className="text-right pl-2">Ganancia</th>
                  </tr>
                </thead>
                <tbody>
                  {((vistaR === "diario" ? (remates.diario || []) : (remates.mensual || []))).map((r: any, i: number) => {
                    const g = Number(r.ganancia_final);
                    return (
                      <tr key={i} className="border-b border-gray-800/50 hover:bg-white/[0.02]">
                        <td className="py-2 pr-2 text-white/70 font-mono">{vistaR === "diario" ? (r.dia||"").substring(0,10) : (r.mes||"").substring(0,7)}</td>
                        <td className="text-right px-2 text-white/80">Bs. {Number(r.total_pujas).toFixed(2)}</td>
                        <td className="text-right px-2 text-amber-400">Bs. {Number(r.casa).toFixed(2)}</td>
                        <td className={"text-right pl-2 font-bold " + (g >= 0 ? "text-green-400" : "text-red-400")}>Bs. {g.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <button onClick={() => { setRemates(null); setVistaR("diario"); }}
            className="w-full py-3 rounded-xl text-sm font-semibold bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 active:scale-[0.98] transition-all">
            ← Volver
          </button>
        </div>
      )}
    </main>
  );
}
