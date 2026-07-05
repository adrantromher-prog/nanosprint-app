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
    if (index === 0) return "text-amber-300";
    if (index === 1) return "text-gray-300";
    return "text-white/60";
  };

  const getPuestoIcon = (index: number) => {
    if (index === 0) return "1";
    if (index === 1) return "2";
    return `${index + 1}`;
  };

  return (
    <main className="relative min-h-screen w-full text-white bg-[#0a0b0e]">
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 90% 50% at 50% -10%, rgba(180,120,20,0.06), transparent),
                      radial-gradient(ellipse 60% 40% at 80% 90%, rgba(0,200,255,0.03), transparent)`
        }}
      />

      <div className="relative z-10 px-3 md:px-4 py-3 max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-amber-400/90">Clasificación</h1>
            <p className="text-white/30 text-xs font-medium">Polla {pollaId ? `#${pollaId}` : ""}</p>
          </div>
          <div className="flex gap-1.5">
            <button onClick={() => {
              const params = new URLSearchParams(window.location.search);
              router.push(params.get("admin") ? "/admin/polla" : "/polla");
            }}
              className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/60 font-medium text-xs hover:bg-white/10 active:scale-95 transition-all">
              Volver
            </button>
            <button onClick={() => router.push("/home")}
              className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/40 font-medium text-xs hover:bg-white/10 active:scale-95 transition-all">
              Salir
            </button>
          </div>
        </div>

        {pollaInfo && (
          <div className="bg-gradient-to-b from-amber-500/8 to-amber-600/5 border border-amber-400/15 rounded-xl px-4 py-3 mb-4">
            <div className="flex items-center justify-center gap-8">
              <div className="text-center">
                <p className="text-amber-300 font-black text-xl md:text-3xl tabular-nums">
                  Bs. {!pollaInfo.activa && pollaInfo.cerrada_en
                    ? Number(pollaInfo.premio_1 || 0).toLocaleString()
                    : Math.floor((pollaInfo.total_participantes || 0) * (pollaInfo.costo || 700) * 0.65).toLocaleString()
                  }
                </p>
                <p className="text-amber-400/40 text-[9px] uppercase tracking-widest font-medium">1° Lugar</p>
              </div>
              <div className="w-px h-8 bg-amber-400/10" />
              <div className="text-center">
                <p className="text-gray-300 font-black text-xl md:text-3xl tabular-nums">
                  Bs. {!pollaInfo.activa && pollaInfo.cerrada_en
                    ? Number(pollaInfo.premio_2 || 0).toLocaleString()
                    : Math.floor((pollaInfo.total_participantes || 0) * (pollaInfo.costo || 700) * 0.20).toLocaleString()
                  }
                </p>
                <p className="text-gray-400/40 text-[9px] uppercase tracking-widest font-medium">2° Lugar</p>
              </div>
            </div>
            <div className="text-center mt-1.5">
              <span className="text-white/20 text-[10px]">{pollaInfo.total_participantes || 0} ticket{(pollaInfo.total_participantes || 0) !== 1 ? "s" : ""}</span>
            </div>
          </div>
        )}

        {!pollaId ? (
          <div className="text-center py-12">
            <p className="text-white/20 text-sm">Cargando...</p>
          </div>
        ) : clasificacion.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-white/20 text-sm">Aún no hay participantes</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {clasificacion.map((p, index) => {
              const numsArr: number[] = (p.selecciones || [])
                .sort((a: any, b: any) => a.carrera_orden - b.carrera_orden)
                .map((s: any) => s.caballo_numero);
              return (
                <div key={`${p.usuario_id}-${p.ticket}`}
                  className={`rounded-xl border transition-all ${
                    index === 0
                      ? "bg-gradient-to-r from-amber-500/8 to-amber-600/5 border-amber-400/20"
                      : "bg-white/[0.02] border-white/[0.06]"
                  }`}>
                  <div className="px-3 py-1.5">
                    <div className="flex items-center">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
                          index === 0 ? "bg-amber-400/15 text-amber-300 border border-amber-400/30" :
                          index === 1 ? "bg-gray-400/15 text-gray-300 border border-gray-400/30" :
                          "bg-white/5 text-white/40 border border-white/10"
                        }`}>
                          {getPuestoIcon(index)}
                        </div>
                        <span className="text-white/30 text-[9px] font-mono shrink-0">#{p.ticket}</span>
                        <span className="font-semibold text-white/80 text-[12px] truncate">{p.sobrenombre}</span>
                      </div>
                      <div className="flex items-center gap-0.5 mx-3">
                        {numsArr.map((n, i) => (
                          <span key={i} className={`w-5 h-5 flex items-center justify-center text-[11px] font-bold rounded border ${getPuestoColor(index)} ${
                            index === 0 ? "border-amber-400/25 bg-amber-400/8" :
                            index === 1 ? "border-gray-400/25 bg-gray-400/8" :
                            "border-white/10 bg-white/[0.03]"
                          }`}>{n}</span>
                        ))}
                      </div>
                      <div className="text-right flex-1">
                        <p className={`text-xs font-bold ${getPuestoColor(index)}`}>{Number(p.puntos)} <span className="font-normal text-[9px] text-white/30">pts</span></p>
                        {Number(p.premio) > 0 && (
                          <p className="text-emerald-400/80 font-semibold text-[9px]">+Bs. {Number(p.premio).toLocaleString()}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-8 text-center">
          <p className="text-white/[0.04] text-[8px] uppercase tracking-[0.3em] font-medium">NanoSprint</p>
        </div>
      </div>
    </main>
  );
}