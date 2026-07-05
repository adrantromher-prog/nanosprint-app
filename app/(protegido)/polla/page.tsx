"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import useWebSocket from "@/hooks/useWebSocket";

export default function PollaPage() {
  const router = useRouter();
  const [polla, setPolla] = useState<any>(null);
  const [usuario, setUsuario] = useState<any>(null);
  const [selecciones, setSelecciones] = useState<{ [carreraOrden: number]: number }>({});
  const [misTickets, setMisTickets] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);
  const [showTickets, setShowTickets] = useState(false);
  const [tiempoRestante, setTiempoRestante] = useState<number | null>(null);
  const [clasificacion, setClasificacion] = useState<any[]>([]);
  const [mostrarClasificacion, setMostrarClasificacion] = useState(false);
  const intervaloRef = useRef<any>(null);

  const tiempoTerminado = tiempoRestante !== null && tiempoRestante <= 0;

  const fetchData = useCallback(async () => {
    const [resPolla, resUser, resApuesta] = await Promise.all([
      fetch("/api/polla/activa").then(r => r.json()),
      fetch(`/api/me?_t=${Date.now()}`).then(r => r.json()),
      fetch("/api/polla/mi-apuesta").then(r => r.json()),
    ]);
    if (resPolla.ok) setPolla(resPolla.polla);
    if (resUser.nombre) setUsuario(resUser);
    if (resApuesta.ok) setMisTickets(resApuesta.apuesta || []);
    setSelecciones({});
  }, []);

  const fetchClasificacion = useCallback(async (pollaId: number) => {
    const res = await fetch(`/api/polla/clasificacion?polla_id=${pollaId}`);
    const data = await res.json();
    if (data.ok) setClasificacion(data.clasificacion);
  }, []);

  useWebSocket(useCallback((event) => {
    if (["polla_creada", "polla_resultados", "polla_apuesta", "polla_retiros"].includes(event.type)) {
      fetchData();
    }
    if (event.type === "polla_resultados" && polla) {
      fetchClasificacion(polla.id);
    }
  }, [fetchData, fetchClasificacion, polla]));

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (intervaloRef.current) clearInterval(intervaloRef.current);
    if (!polla?.cierre_en) {
      setTiempoRestante(null);
      setMostrarClasificacion(false);
      return;
    }
    const actualizar = () => {
      const diff = new Date(polla.cierre_en).getTime() - Date.now();
      setTiempoRestante(diff);
      if (diff <= 0) {
        setMostrarClasificacion(true);
        fetchClasificacion(polla.id);
        if (intervaloRef.current) clearInterval(intervaloRef.current);
      }
    };
    actualizar();
    if (new Date(polla.cierre_en).getTime() > Date.now()) {
      intervaloRef.current = setInterval(actualizar, 1000);
    } else {
      setMostrarClasificacion(true);
      fetchClasificacion(polla.id);
    }
    return () => { if (intervaloRef.current) clearInterval(intervaloRef.current); };
  }, [polla?.id, polla?.cierre_en, fetchClasificacion]);

  const seleccionarCaballo = (carreraOrden: number, caballoNum: number) => {
    setSelecciones(prev => prev[carreraOrden] === caballoNum
      ? Object.fromEntries(Object.entries(prev).filter(([k]) => Number(k) !== carreraOrden))
      : { ...prev, [carreraOrden]: caballoNum });
  };

  const enviarApuesta = async () => {
    if (!polla) return;
    if (Object.keys(selecciones).length !== 6) {
      alert("Selecciona un caballo para cada una de las 6 carreras");
      return;
    }
    setCargando(true);
    const res = await fetch("/api/polla/apostar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        polla_id: polla.id,
        selecciones: Object.fromEntries(Object.entries(selecciones).map(([k, v]) => [k, v])),
      }),
    });
    const data = await res.json();
    setCargando(false);
    if (data.ok) {
      setSelecciones({});
      alert(`¡Apuesta registrada! Ticket #${data.ticket}`);
      fetchData();
    } else {
      alert(data.error || "Error al registrar apuesta");
    }
  };

  const formatearTiempo = (ms: number) => {
    if (ms <= 0) return "00:00:00";
    const segs = Math.floor(ms / 1000);
    const h = Math.floor(segs / 3600);
    const m = Math.floor((segs % 3600) / 60);
    const s = segs % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const getPuestoColor = (index: number) => {
    if (index === 0) return "text-amber-300";
    if (index === 1) return "text-gray-300";
    return "text-white/60";
  };

  if (!usuario) {
    return (
      <main className="min-h-screen flex items-center justify-center text-white bg-[#0a0b0e]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-amber-400/20 border-t-amber-400 rounded-full animate-spin" />
          <span className="text-gray-500 text-sm">Cargando...</span>
        </div>
      </main>
    );
  }

  if (!polla) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center text-white bg-[#0a0b0e] gap-4 px-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-400/20 flex items-center justify-center text-2xl">🏇</div>
        <h1 className="text-xl font-bold text-gray-300">No hay Polla activa</h1>
        <p className="text-gray-500 text-sm text-center">El administrador aún no ha creado una Polla Hípica</p>
        <button onClick={() => router.push("/home")}
          className="mt-2 px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/70 font-medium text-sm hover:bg-white/10 active:scale-95 transition-all">
          Volver al inicio
        </button>
      </main>
    );
  }

  const todasConResultado = polla.resultados?.length >= 6;
  const costo = Number(polla.costo);
  const totalSel = Object.keys(selecciones).length;
  const mostrarSeleccion = !tiempoTerminado && !todasConResultado;

  return (
    <main className="relative min-h-screen w-full text-white bg-[#0a0b0e]">
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 90% 50% at 50% -10%, rgba(180,120,20,0.06), transparent),
                      radial-gradient(ellipse 60% 40% at 80% 90%, rgba(255,150,0,0.03), transparent)`
        }}
      />

      <div className="relative z-10 px-3 md:px-4 py-3 max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-amber-400/90">Polla Hípica</h1>
            <p className="text-amber-300/60 text-xs font-medium">{polla.hipodromo}</p>
          </div>
          <div className="flex gap-1.5">
            {!mostrarClasificacion && (
              <button onClick={() => { setMostrarClasificacion(true); fetchClasificacion(polla.id); }}
                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/60 font-medium text-xs hover:bg-white/10 active:scale-95 transition-all">
                Clasificación
              </button>
            )}
            <button onClick={() => router.push("/home")}
              className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/40 font-medium text-xs hover:bg-white/10 active:scale-95 transition-all">
              Salir
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl px-3.5 py-2.5 mb-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400/30 to-amber-600/30 border border-amber-400/20 flex items-center justify-center text-white font-bold text-xs">
            {usuario.nombre.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white/80 text-xs font-semibold truncate">{usuario.nombre}</p>
            <p className="text-emerald-400/80 font-bold text-xs">Bs. {Number(usuario.saldo).toLocaleString()}</p>
          </div>
          {misTickets.length > 0 && (
            <button onClick={() => setShowTickets(true)}
              className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-400/20 text-emerald-400/80 text-[10px] font-semibold hover:bg-emerald-500/20 active:scale-95 transition-all">
              {misTickets.length} ticket{misTickets.length !== 1 ? "s" : ""}
            </button>
          )}
        </div>

        <div className="bg-gradient-to-b from-amber-500/8 to-amber-600/5 border border-amber-400/15 rounded-xl px-4 py-3 mb-3">
          <div className="flex items-center justify-center gap-8">
            <div className="text-center">
              <p className="text-amber-300 font-bold text-lg md:text-xl tabular-nums">Bs. {Math.floor(costo * (polla.total_tickets || 1) * 0.65).toLocaleString()}</p>
              <p className="text-amber-400/40 text-[9px] uppercase tracking-widest font-medium">1° Lugar</p>
            </div>
            <div className="w-px h-8 bg-amber-400/10" />
            <div className="text-center">
              <p className="text-gray-300 font-bold text-lg md:text-xl tabular-nums">Bs. {Math.floor(costo * (polla.total_tickets || 1) * 0.20).toLocaleString()}</p>
              <p className="text-gray-400/40 text-[9px] uppercase tracking-widest font-medium">2° Lugar</p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-3 mt-2 pt-2 border-t border-amber-400/8">
            <span className="text-amber-300/40 text-[10px]">{polla.total_tickets || 0} ticket{(polla.total_tickets || 0) !== 1 ? "s" : ""}</span>
            <span className="text-white/10 text-[10px]">·</span>
            <span className="text-amber-300/40 text-[10px]">Bs. {costo.toLocaleString()} c/u</span>
          </div>
        </div>

        {polla.cierre_en && (
          <div className={`rounded-xl px-4 py-2 mb-3 text-center border ${
            tiempoTerminado
              ? "bg-red-900/20 border-red-400/20"
              : "bg-amber-500/8 border-amber-400/15"
          }`}>
            {tiempoRestante !== null && (
              <p className={`font-bold text-lg tabular-nums tracking-wider ${
                tiempoTerminado ? "text-red-400" : "text-amber-300"
              }`}>
                {tiempoTerminado ? "CIERRE" : formatearTiempo(tiempoRestante)}
              </p>
            )}
            <p className="text-white/30 text-[10px] font-medium">
              {tiempoTerminado ? "Tiempo de apuestas terminado" : "Tiempo restante para apostar"}
            </p>
          </div>
        )}

        {mostrarClasificacion ? (
          <div className="space-y-1.5">
            <h2 className="text-sm font-bold text-white/60 mb-2">Clasificación</h2>
            {clasificacion.length === 0 ? (
              <p className="text-center py-8 text-white/20 text-sm">Aún no hay participantes</p>
            ) : (
              clasificacion.map((p: any, index: number) => {
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
                            {index === 0 ? "1" : index === 1 ? "2" : `${index + 1}`}
                          </div>
                          <span className="text-white/30 text-[9px] font-mono shrink-0">#{p.ticket}</span>
                          <span className="font-semibold text-white/80 text-[12px] truncate">{p.sobrenombre}</span>
                        </div>
                        <div className="flex items-center gap-0.5 mx-3">
                          {numsArr.map((n: number, i: number) => (
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
              })
            )}
          </div>
        ) : (
          <>
            {todasConResultado && (
              <div className="bg-emerald-500/5 border border-emerald-400/10 rounded-lg px-3 py-2 mb-3">
                <p className="text-emerald-300/60 text-[11px] font-medium text-center">Todas las carreras tienen resultado — espera el cierre</p>
              </div>
            )}

            {mostrarSeleccion && (
              <>
                <div className="space-y-2">
                  {polla.carreras?.map((carrera: any) => {
                    const resultado = polla.resultados?.find((r: any) => r.carrera_orden === carrera.orden);
                    const seleccionLocal = selecciones[carrera.orden];
                    const retirados: number[] = carrera.retirados || [];
                    const caballos = Array.from({ length: carrera.cantidad_caballos }, (_, i) => i + 1);

                    return (
                      <div key={carrera.orden}
                        className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3">
                        <div className="flex items-start gap-2">
                          <div className="w-6 h-6 rounded-lg bg-amber-500/10 border border-amber-400/15 flex items-center justify-center shrink-0 mt-0.5">
                            <span className="text-[10px] font-bold text-amber-400/70">{carrera.numero || carrera.orden}</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {caballos.map((num) => {
                              const selected = seleccionLocal === num;
                              const esRetirado = retirados.includes(num);

                              return (
                                <button key={num}
                                  onClick={() => !esRetirado && seleccionarCaballo(carrera.orden, num)}
                                  disabled={esRetirado}
                                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg border flex items-center justify-center font-bold text-xs transition-all duration-150
                                    ${esRetirado
                                      ? "border-red-400/20 bg-red-500/8 text-red-400/50 line-through cursor-default"
                                      : selected
                                        ? "border-amber-400/60 bg-amber-400/15 text-white scale-110 shadow-[0_0_12px_rgba(255,180,0,0.15)]"
                                        : "border-white/[0.08] bg-white/[0.02] text-white/40 hover:border-white/20 hover:text-white/60"
                                    }
                                    ${esRetirado ? "cursor-default" : "cursor-pointer active:scale-95"}`}>
                                  {num}
                                </button>
                              );
                            })}
                          </div>
                          {resultado && (
                            <div className="flex gap-1 shrink-0 mt-1">
                              {resultado.primer_lugar && <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300/70 border border-amber-400/15 text-[9px] font-medium">1° #{resultado.primer_lugar}</span>}
                              {resultado.segundo_lugar && <span className="px-1.5 py-0.5 rounded bg-gray-400/10 text-gray-300/70 border border-gray-400/15 text-[9px] font-medium">2° #{resultado.segundo_lugar}</span>}
                              {resultado.tercer_lugar && <span className="px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-300/70 border border-orange-400/15 text-[9px] font-medium">3° #{resultado.tercer_lugar}</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <div className="h-full rounded-full bg-amber-400/50 transition-all duration-300"
                      style={{ width: `${(totalSel / 6) * 100}%` }} />
                  </div>
                  <span className="text-white/30 text-xs font-medium tabular-nums">{totalSel}/6</span>
                </div>

                <button onClick={enviarApuesta} disabled={cargando || totalSel !== 6}
                  className="mt-3 w-full py-3 rounded-xl bg-amber-500/20 border border-amber-400/30 text-amber-300 font-semibold text-sm
                    hover:bg-amber-500/30 active:scale-[0.98] transition-all duration-150
                    disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-amber-500/20 disabled:active:scale-100">
                  {cargando ? "Procesando..." : totalSel === 6
                    ? `Confirmar — Bs. ${costo.toLocaleString()}`
                    : `Selecciona ${6 - totalSel} más`}
                </button>
              </>
            )}
          </>
        )}

        {misTickets.length > 0 && (
          <div className="mt-4 bg-white/[0.02] border border-white/[0.06] rounded-xl p-3">
            <p className="text-white/30 text-[11px] text-center font-medium">
              Tienes {misTickets.length} ticket{misTickets.length !== 1 ? "s" : ""} activo{misTickets.length !== 1 ? "s" : ""}. Puedes comprar más.
            </p>
          </div>
        )}

        {showTickets && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
            onClick={() => setShowTickets(false)}>
            <div className="bg-[#0a0b0e] border border-white/[0.08] rounded-2xl w-full max-w-sm max-h-[80vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
                <h3 className="text-sm font-bold text-white/80">Mis Tickets</h3>
                <button onClick={() => setShowTickets(false)}
                  className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 text-xs hover:bg-white/10 active:scale-95 transition-all">
                  ✕
                </button>
              </div>
              <div className="p-3 space-y-2">
                {misTickets.map((t: any) => (
                  <div key={t.ticket}
                    className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white/60 text-[11px] font-semibold">Ticket #{t.ticket}</span>
                      <span className="text-emerald-400/80 text-[10px] font-semibold">{t.total_puntos} pts</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {(t.selecciones || []).map((s: any, i: number) => (
                        <span key={i}
                          className="w-6 h-6 rounded-md border border-white/[0.08] bg-white/[0.02] flex items-center justify-center text-[10px] font-bold text-white/60">
                          {s.caballo_numero}
                        </span>
                      ))}
                    </div>
                    <p className="text-white/15 text-[9px] mt-1.5">
                      {(t.selecciones || []).map((s: any) => s.carrera_orden).join("-")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 text-center">
          <p className="text-white/[0.04] text-[8px] uppercase tracking-[0.3em] font-medium">NanoSprint</p>
        </div>
      </div>
    </main>
  );
}
