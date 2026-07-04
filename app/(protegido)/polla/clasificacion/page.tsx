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
    if (index === 2) return "text-orange-300";
    return "text-white";
  };

  const getPuestoIcon = (index: number) => {
    if (index === 0) return "👑";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
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

      <div className="relative z-10 p-4 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-4xl font-bold text-amber-300 drop-shadow-[0_0_12px_rgba(255,200,0,0.4)]">
              📊 Clasificación
            </h1>
            <p className="text-gray-400 text-sm">Polla Hípica {pollaId ? `#${pollaId}` : ""}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => router.push("/polla")}
              className="px-4 py-2 rounded-xl bg-amber-700/70 border border-amber-400/70 text-white font-bold text-sm hover:brightness-110 active:scale-95 transition-all">
              ← Polla
            </button>
            <button onClick={() => router.push("/home")}
              className="px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white font-bold text-sm hover:bg-white/20 active:scale-95 transition-all">
              Home
            </button>
          </div>
        </div>

        {pollaInfo && !pollaInfo.activa && pollaInfo.cerrada_en && (
          <div className="bg-gradient-to-r from-yellow-900/30 via-amber-800/30 to-yellow-900/30 border border-yellow-400/40 rounded-2xl p-4 mb-6 text-center">
            <p className="text-yellow-300 font-bold text-lg">🏆 Polla Cerrada</p>
            <div className="flex justify-center gap-6 mt-2 text-sm">
              <div><span className="text-yellow-300 font-bold">1er:</span> Bs. {Number(pollaInfo.premio_1 || 0).toLocaleString()}</div>
              <div><span className="text-gray-300 font-bold">2do:</span> Bs. {Number(pollaInfo.premio_2 || 0).toLocaleString()}</div>
              <div><span className="text-orange-300 font-bold">3ro:</span> Bs. {Number(pollaInfo.premio_3 || 0).toLocaleString()}</div>
            </div>
          </div>
        )}

        {!pollaId ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-4">🏇</p>
            <p>Cargando...</p>
          </div>
        ) : clasificacion.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-4">🏇</p>
            <p>Aún no hay participantes en esta polla</p>
          </div>
        ) : (
          <div className="space-y-3">
            {clasificacion.map((p, index) => (
              <div key={p.usuario_id}
                className={`rounded-2xl border p-4 transition-all ${
                  index === 0
                    ? "bg-gradient-to-r from-yellow-900/30 via-amber-800/20 to-yellow-900/30 border-yellow-400/40 shadow-[0_0_20px_rgba(255,200,0,0.15)]"
                    : "bg-gray-900/60 border-gray-700/50"
                }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                      index === 0 ? "bg-yellow-500/20 text-yellow-300 border border-yellow-400/50" :
                      index === 1 ? "bg-gray-400/20 text-gray-300 border border-gray-400/50" :
                      index === 2 ? "bg-orange-500/20 text-orange-300 border border-orange-400/50" :
                      "bg-white/5 text-gray-400 border border-white/10"
                    }`}>
                      {getPuestoIcon(index)}
                    </div>
                    <div>
                      <p className="font-bold text-white">{p.sobrenombre}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-xl font-black ${getPuestoColor(index)}`}>{Number(p.puntos)} pts</p>
                    {Number(p.premio) > 0 && (
                      <p className="text-green-300 font-bold text-sm">+Bs. {Number(p.premio).toLocaleString()}</p>
                    )}
                  </div>
                </div>

                {p.selecciones?.length > 0 && (
                  <div className="grid grid-cols-6 gap-1.5 mt-2">
                    {p.selecciones.map((s: any) => {
                      const bgColor = s.puntos === 5 ? "bg-yellow-500/20 border-yellow-400/40" :
                        s.puntos === 3 ? "bg-gray-400/20 border-gray-400/40" :
                        s.puntos === 1 ? "bg-orange-500/20 border-orange-400/40" :
                        "bg-red-500/10 border-red-400/30";
                      const textColor = s.puntos >= 5 ? "text-yellow-300" :
                        s.puntos >= 3 ? "text-gray-300" :
                        s.puntos >= 1 ? "text-orange-300" : "text-red-400";
                      return (
                        <div key={s.carrera_remate_id} className={`text-center px-1.5 py-1.5 rounded-lg border ${bgColor}`}>
                          <p className="text-[10px] text-gray-500">C{s.orden}</p>
                          <p className={`text-[11px] font-bold ${textColor}`}>#{s.caballo_numero}</p>
                          <p className={`text-[10px] font-bold ${textColor}`}>+{s.puntos}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
