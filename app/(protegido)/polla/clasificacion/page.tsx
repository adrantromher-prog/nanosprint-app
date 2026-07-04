"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import useWebSocket from "@/hooks/useWebSocket";

export default function PollaClasificacion() {
  const router = useRouter();
  const [clasificacion, setClasificacion] = useState<any[]>([]);
  const [pollaInfo, setPollaInfo] = useState<any>(null);
  const [pollaId, setPollaId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setPollaId(params.get("polla_id"));
  }, []);

  const fetchClasificacion = useCallback(async () => {
    if (!pollaId) return;
    const [resClasif, resEstado] = await Promise.all([
      fetch(`/api/polla/clasificacion?polla_id=${pollaId}`).then(r => r.json()),
      fetch("/api/polla/estado").then(r => r.json()),
    ]);
    if (resClasif.ok) setClasificacion(resClasif.clasificacion);
    if (resEstado.ok) setPollaInfo(resEstado.polla);
  }, [pollaId]);

  useWebSocket(useCallback((event) => {
    if (["polla_resultados", "polla_cerrada", "polla_apuesta"].includes(event.type)) {
      fetchClasificacion();
    }
  }, [fetchClasificacion]));

  useEffect(() => { if (pollaId) fetchClasificacion(); }, [pollaId, fetchClasificacion]);

  const getPuestoColor = (index: number) => {
    if (index === 0) return "text-yellow-300";
    if (index === 1) return "text-gray-300";
    return "text-white";
  };

  const getPuestoIcon = (index: number) => {
    if (index === 0) return "👑";
    if (index === 1) return "🥈";
    return `#${index + 1}`;
  };

  return (
    <main className="relative min-h-screen w-full text-white overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950" />
      <div className="absolute inset-0 opacity-20"
        style={{
          background: `radial-gradient(ellipse 80% 60% at 50% -20%, rgba(255,200,0,0.15), transparent),
                      radial-gradient(ellipse 60% 50% at 80% 80%, rgba(0,255,255,0.08), transparent)`
        }}
      />

      <style>{`
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
      `}</style>

      <div className="relative z-10 p-3 md:p-4 max-w-4xl mx-auto">
        <div className="flex items-start justify-between mb-3 md:mb-6 gap-2">
          <div>
            <h1 className="text-lg md:text-3xl lg:text-4xl font-bold text-amber-300 drop-shadow-[0_0_12px_rgba(255,200,0,0.4)]">
              📊 Clasif.
            </h1>
            <p className="text-gray-400 text-[10px] md:text-sm">Polla {pollaId ? `#${pollaId}` : ""}</p>
          </div>
          <div className="flex gap-1.5 shrink-0">
            <button onClick={() => router.push("/polla")}
              className="px-2.5 py-1.5 md:px-4 md:py-2 rounded-lg md:rounded-xl bg-amber-700/70 border border-amber-400/70 text-white font-bold text-[10px] md:text-sm hover:brightness-110 active:scale-95 transition-all">
              ← Polla
            </button>
            <button onClick={() => router.push("/home")}
              className="px-2.5 py-1.5 md:px-4 md:py-2 rounded-lg md:rounded-xl bg-white/10 border border-white/20 text-white font-bold text-[10px] md:text-sm hover:bg-white/20 active:scale-95 transition-all">
              Home
            </button>
          </div>
        </div>

        {pollaInfo && (
          <div className="bg-gradient-to-r from-yellow-900/30 via-amber-800/30 to-yellow-900/30 border border-yellow-400/40 rounded-xl md:rounded-2xl p-3 md:p-4 mb-3 md:mb-6 text-center">
            {!pollaInfo.activa && pollaInfo.cerrada_en ? (
              <div className="flex justify-center gap-6 md:gap-10">
                <div><span className="text-yellow-300 font-black text-lg md:text-3xl">Bs. {Number(pollaInfo.premio_1 || 0).toLocaleString()}</span><p className="text-yellow-200/60 text-[9px] md:text-xs uppercase tracking-wide">1° Lugar</p></div>
                <div><span className="text-gray-300 font-black text-lg md:text-3xl">Bs. {Number(pollaInfo.premio_2 || 0).toLocaleString()}</span><p className="text-gray-300/60 text-[9px] md:text-xs uppercase tracking-wide">2° Lugar</p></div>
              </div>
            ) : (
              <div className="flex justify-center gap-6 md:gap-10">
                <div><span className="text-yellow-300 font-black text-lg md:text-3xl">Bs. {Math.floor((pollaInfo.total_participantes || 0) * (pollaInfo.costo || 700) * 0.65).toLocaleString()}</span><p className="text-yellow-200/60 text-[9px] md:text-xs uppercase tracking-wide">1° Lugar</p></div>
                <div><span className="text-gray-300 font-black text-lg md:text-3xl">Bs. {Math.floor((pollaInfo.total_participantes || 0) * (pollaInfo.costo || 700) * 0.20).toLocaleString()}</span><p className="text-gray-300/60 text-[9px] md:text-xs uppercase tracking-wide">2° Lugar</p></div>
              </div>
            )}
            <p className="text-gray-500 text-[8px] md:text-[10px] mt-1">{pollaInfo.total_participantes || 0} ticket(s)</p>
          </div>
        )}

        {!pollaId ? (
          <div className="text-center py-8 md:py-12 text-gray-400">
            <p className="text-2xl md:text-4xl mb-3">🏇</p>
            <p className="text-xs md:text-sm">Cargando...</p>
          </div>
        ) : clasificacion.length === 0 ? (
          <div className="text-center py-8 md:py-12 text-gray-400">
            <p className="text-2xl md:text-4xl mb-3">🏇</p>
            <p className="text-xs md:text-sm">Aún no hay participantes en esta polla</p>
          </div>
        ) : (
          <div className="space-y-2 md:space-y-3">
            {clasificacion.map((p, index) => {
              const nums = (p.selecciones || [])
                .sort((a: any, b: any) => a.carrera_orden - b.carrera_orden)
                .map((s: any) => s.caballo_numero)
                .join("-");
              return (
                <div key={`${p.usuario_id}-${p.ticket}`}
                  className={`rounded-xl md:rounded-2xl border p-2.5 md:p-3 transition-all ${
                    index === 0
                      ? "bg-gradient-to-r from-yellow-900/30 via-amber-800/20 to-yellow-900/30 border-yellow-400/40 shadow-[0_0_20px_rgba(255,200,0,0.15)]"
                      : "bg-gray-900/60 border-gray-700/50"
                  }`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 md:w-9 md:h-9 rounded-full flex items-center justify-center font-bold text-[10px] md:text-base shrink-0 ${
                      index === 0 ? "bg-yellow-500/20 text-yellow-300 border border-yellow-400/50" :
                      index === 1 ? "bg-gray-400/20 text-gray-300 border border-gray-400/50" :
                      "bg-white/5 text-gray-400 border border-white/10"
                    }`}>
                      {getPuestoIcon(index)}
                    </div>
                    <div className="flex items-center gap-1.5 md:gap-2 min-w-0 flex-wrap">
                      <span className="font-bold text-white text-xs md:text-sm truncate">{p.sobrenombre}</span>
                      {nums && (
                        <span className={`font-mono font-bold text-xs md:text-sm ${getPuestoColor(index)}`}>{nums}</span>
                      )}
                    </div>
                    <div className="ml-auto text-right shrink-0">
                      <p className={`text-xs md:text-base font-black ${getPuestoColor(index)}`}>{Number(p.puntos)} pts</p>
                      {Number(p.premio) > 0 && (
                        <p className="text-green-300 font-bold text-[9px] md:text-xs">+Bs. {Number(p.premio).toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                  <p className="text-[7px] md:text-[9px] text-gray-500 mt-0.5">Ticket #{p.ticket}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
