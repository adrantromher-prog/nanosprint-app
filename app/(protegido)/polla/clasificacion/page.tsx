"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import useWebSocket from "@/hooks/useWebSocket";

export default function PollaClasificacion() {
  const router = useRouter();
  const [clasificacion, setClasificacion] = useState<any[]>([]);
  const [pollaInfo, setPollaInfo] = useState<any>(null);
  const [pollaId, setPollaId] = useState<string | null>(null);
  const [carreras, setCarreras] = useState<any[]>([]);
  const [resultados, setResultados] = useState<any[]>([]);
  const [usuarioId, setUsuarioId] = useState<number | null>(null);
  const [soloMios, setSoloMios] = useState(false);
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setPollaId(params.get("polla_id"));
    fetch("/api/me").then(r => r.json()).then(data => {
      if (data.id) setUsuarioId(data.id);
    });
  }, []);

  const fetchClasificacion = useCallback(async () => {
    if (!pollaId) return;
    try {
      const [resClasif, resEstado] = await Promise.all([
        fetch(`/api/polla/clasificacion?polla_id=${pollaId}`).then(r => r.json()),
        fetch(`/api/polla/estado?polla_id=${pollaId}`).then(r => r.json()),
      ]);
      if (resClasif.ok) { setClasificacion(resClasif.clasificacion); setCarreras(resClasif.carreras || []); setResultados(resClasif.resultados || []); setAnimKey(k => k + 1); }
      if (resEstado.ok) setPollaInfo(resEstado.polla);
    } catch (e) {
      console.error("Error fetching clasificacion:", e);
    }
  }, [pollaId]);

  useWebSocket(useCallback((event) => {
    if (["polla_resultados", "polla_cerrada", "polla_apuesta"].includes(event.type)) {
      fetchClasificacion();
    }
  }, [fetchClasificacion]));

  useEffect(() => { if (pollaId) fetchClasificacion(); }, [pollaId, fetchClasificacion]);

  useEffect(() => {
    if (!pollaId) return;
    const id = setInterval(fetchClasificacion, 5000);
    return () => clearInterval(id);
  }, [pollaId, fetchClasificacion]);

  const itemsMostrar = soloMios && usuarioId
    ? clasificacion.filter(p => Number(p.usuario_id) === usuarioId)
    : clasificacion;

  const getPuesto = (puntos: number) => {
    const unicos = [...new Set(clasificacion.map(p => Number(p.puntos)))].sort((a, b) => b - a);
    return unicos.indexOf(Number(puntos)) + 1;
  };

  const getPuestoColor = () => "text-white/60";

  const getResultadoBox = (carreraOrden: number, caballoNum: number) => {
    const r = resultados.find((res: any) => Number(res.carrera_orden) === carreraOrden);
    if (!r) return null;
    if (Number(r.primer_lugar) === caballoNum) return "1";
    if (Number(r.segundo_lugar) === caballoNum) return "2";
    if (Number(r.tercer_lugar) === caballoNum) return "3";
    return null;
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
                  Bs. {(!pollaInfo.activa && pollaInfo.cerrada_en && Number(pollaInfo.premio_1) > 0)
                    ? Number(pollaInfo.premio_1).toLocaleString()
                    : Math.floor((pollaInfo.total_participantes || 0) * (pollaInfo.costo || 700) * 0.65).toLocaleString()
                  }
                </p>
                <p className="text-amber-400/40 text-[9px] uppercase tracking-widest font-medium">1° Lugar</p>
              </div>
              <div className="w-px h-8 bg-amber-400/10" />
              <div className="text-center">
                <p className="text-gray-300 font-black text-xl md:text-3xl tabular-nums">
                  Bs. {(!pollaInfo.activa && pollaInfo.cerrada_en && Number(pollaInfo.premio_2) > 0)
                    ? Number(pollaInfo.premio_2).toLocaleString()
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
        ) : itemsMostrar.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-white/20 text-sm">{soloMios ? "No tienes tickets en esta polla" : "Aún no hay participantes"}</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            <div className="flex items-center px-3 mb-1">
              <div className="flex-1 min-w-0" />
              {usuarioId && clasificacion.some(p => Number(p.usuario_id) === usuarioId) && (
                <button onClick={() => setSoloMios(v => !v)}
                  className={`px-2.5 py-1 rounded-lg border text-[10px] font-semibold transition-all active:scale-95 ${
                    soloMios
                      ? "bg-emerald-500/15 border-emerald-400/25 text-emerald-400"
                      : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"
                  }`}>
                  {soloMios ? "Ver todos" : "Mis tickets"}
                </button>
              )}
            </div>
            {carreras.length > 0 && (
              <div className="flex items-center px-3 mb-1">
                <div className="flex-1 min-w-0" />
                <div className="flex items-center gap-0.5 mx-3">
                  {carreras.map((c) => (
                    <div key={c.orden} className="w-8 text-center">
                      <p className="text-[10px] text-white/30 font-semibold leading-tight truncate">{c.nombre}</p>
                    </div>
                  ))}
                </div>
                <div className="shrink-0 w-14 text-right">
                  <p className="text-[10px] text-white/20 font-semibold">pts</p>
                </div>
              </div>
            )}
            {itemsMostrar.map((p) => {
              const puesto = getPuesto(p.puntos);
              const selecs: any[] = (p.selecciones || [])
                .sort((a: any, b: any) => a.carrera_orden - b.carrera_orden);
              return (
                <div key={`${p.usuario_id}-${p.ticket}`}
                  className="rounded-xl border bg-white/[0.02] border-white/[0.06] transition-all">
                  <div className="px-3 py-1.5">
                    <div className="flex items-center">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 bg-white/5 text-white/40 border border-white/10">
                          {puesto}
                        </div>
                        <span className="text-white/30 text-[9px] font-mono shrink-0">#{p.ticket}</span>
                        <span className="font-semibold text-white/80 text-[12px] truncate">{p.sobrenombre}</span>
                      </div>
                      <div className="flex items-center gap-0.5 mx-3">
                        {selecs.map((s, i) => {
                          const res = getResultadoBox(s.carrera_orden, s.caballo_numero);
                          const resClass = res === "1" ? "border-yellow-400/60 bg-yellow-400/15 text-yellow-300 shadow-[0_0_10px_rgba(255,200,0,0.3)]" :
                            res === "2" ? "border-gray-300/50 bg-gray-300/12 text-gray-200 shadow-[0_0_8px_rgba(200,200,200,0.2)]" :
                            res === "3" ? "border-orange-400/50 bg-orange-400/12 text-orange-300 shadow-[0_0_8px_rgba(255,150,50,0.2)]" :
                            "border-white/10 bg-white/[0.03]";
                          return (
                            <div key={i} className={`w-8 flex flex-col items-center justify-center text-[10px] font-bold rounded border py-0.5 transition-all duration-500 ${resClass} ${Number(s.puntos) > 0 ? "animate-pulse-once" : ""}`}>
                              <span className="leading-none">{s.caballo_numero}</span>
                              <span className={`leading-none text-[9px] font-medium mt-0.5 ${
                                Number(s.puntos) > 0 ? "text-emerald-400/80" : "text-white/20"
                              }`}>
                                {Number(s.puntos)}pts
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="text-right shrink-0 w-14">
                        <p className={`text-xs font-bold ${getPuestoColor()}`}>{Number(p.puntos)} <span className="font-normal text-[9px] text-white/30">pts</span></p>
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