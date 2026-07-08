"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

export default function TaquillaPage() {
  const router = useRouter();
  const [pollas, setPollas] = useState<any[]>([]);
  const [polla, setPolla] = useState<any>(null);
  const [cargando, setCargando] = useState(true);
  const [selecciones, setSelecciones] = useState<{ [carreraOrden: number]: number }>({});
  const [clienteSobrenombre, setClienteSobrenombre] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [ticketVendido, setTicketVendido] = useState<any>(null);
  const [usuario, setUsuario] = useState<any>(null);
  const [mostrarClasificacion, setMostrarClasificacion] = useState(false);
  const [clasificacion, setClasificacion] = useState<any[]>([]);
  const [carreras, setCarreras] = useState<any[]>([]);
  const [resultados, setResultados] = useState<any[]>([]);
  const [pollaInfoEst, setPollaInfoEst] = useState<any>(null);
  const [conteo, setConteo] = useState("");
  const [cargandoClasif, setCargandoClasif] = useState(false);
  const [conteos, setConteos] = useState<{ [id: number]: string }>({});
  const pollaIdRef = useRef<number | null>(null);

  useEffect(() => {
    fetch("/api/me").then(r => r.json()).then(d => {
      if (d.rol === "taquilla") setUsuario(d);
      else window.location.href = "/home";
    }).catch(() => window.location.href = "/home");
    fetch("/api/polla/disponibles").then(r => r.json()).then(d => {
      if (d.ok) setPollas(d.pollas || []);
      setCargando(false);
    }).catch(() => setCargando(false));
  }, []);

  const calcMs = useCallback((p: any) => {
    if (p.fecha_cierre) return new Date(p.fecha_cierre).getTime();
    if (p.hora_cierre) {
      const [h, m] = p.hora_cierre.split(":").map(Number);
      const c = new Date(); c.setUTCHours(h + 4, m, 0, 0); return c.getTime();
    }
    return 0;
  }, []);

  const fmtTiempo = useCallback((ms: number) => {
    if (!ms) return "";
    const d = ms - Date.now();
    if (d <= 0) return "00:00:00";
    const hh = Math.floor(d / 3600000);
    const mm = Math.floor((d % 3600000) / 60000);
    const ss = Math.floor((d % 60000) / 1000);
    return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  }, []);

  useEffect(() => {
    const actualizar = () => {
      const obj: { [id: number]: string } = {};
      for (const p of pollas) obj[p.id] = fmtTiempo(calcMs(p));
      setConteos(obj);
    };
    actualizar();
    const intervalo = setInterval(actualizar, 1000);
    return () => clearInterval(intervalo);
  }, [pollas, fmtTiempo, calcMs]);

  useEffect(() => {
    if (!polla) return;
    const actualizar = () => setConteo(fmtTiempo(calcMs(polla)));
    actualizar();
    const intervalo = setInterval(actualizar, 1000);
    return () => clearInterval(intervalo);
  }, [polla, fmtTiempo, calcMs]);

  useEffect(() => {
    if (!polla) { pollaIdRef.current = null; return; }
    pollaIdRef.current = polla.id;

    const poll = async () => {
      const pid = pollaIdRef.current;
      if (!pid) return;
      setCargandoClasif(true);
      try {
        const [resClasif, resEstado] = await Promise.all([
          fetch(`/api/polla/clasificacion?polla_id=${pid}`).then(r => r.json()),
          fetch(`/api/polla/estado?polla_id=${pid}`).then(r => r.json()),
        ]);
        if (resClasif.ok) {
          setClasificacion(prev => {
            if (JSON.stringify(prev) === JSON.stringify(resClasif.clasificacion)) return prev;
            return resClasif.clasificacion;
          });
          setCarreras(resClasif.carreras || []);
          setResultados(resClasif.resultados || []);
        }
        if (resEstado.ok && resEstado.polla) {
          setPollaInfoEst(resEstado.polla);
          if (!resEstado.polla.activa || resEstado.polla.cerrada_en) {
            setMostrarClasificacion(true);
          }
        }
      } catch (e) {
        console.error("Error polling:", e);
      } finally {
        setCargandoClasif(false);
      }
    };

    poll();
    const id = setInterval(poll, 5000);
    return () => clearInterval(id);
  }, [polla]);

  const seleccionarPolla = async (id: number) => {
    setCargando(true);
    setMostrarClasificacion(false);
    setClasificacion([]);
    const [resDetalle, resEstado] = await Promise.all([
      fetch(`/api/polla/detalle?id=${id}`).then(r => r.json()),
      fetch(`/api/polla/estado?polla_id=${id}`).then(r => r.json()),
    ]);
    if (resDetalle.ok) {
      setPolla(resDetalle.polla);
      setSelecciones({});
      if (!resDetalle.polla.activa || resDetalle.polla.cerrada_en) {
        setMostrarClasificacion(true);
        if (resEstado.ok && resEstado.polla) setPollaInfoEst(resEstado.polla);
      }
    }
    setCargando(false);
  };

  const seleccionarCaballo = (carreraOrden: number, caballoNum: number) => {
    setSelecciones(prev => prev[carreraOrden] === caballoNum
      ? Object.fromEntries(Object.entries(prev).filter(([k]) => Number(k) !== carreraOrden))
      : { ...prev, [carreraOrden]: caballoNum });
  };

  const vender = async () => {
    if (!polla || Object.keys(selecciones).length !== 6) {
      alert("Selecciona un caballo para cada una de las 6 carreras");
      return;
    }
    if (!clienteSobrenombre.trim()) {
      alert("Ingresa el sobrenombre del cliente");
      return;
    }
    setMostrarConfirmacion(true);
  };

  const confirmarVenta = async () => {
    setMostrarConfirmacion(false);
    setEnviando(true);
    const res = await fetch("/api/polla/apostar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        polla_id: polla.id,
        selecciones,
        cliente_sobrenombre: clienteSobrenombre.trim(),
      }),
    });
    const data = await res.json();
    setEnviando(false);
    if (data.ok) {
      setTicketVendido({
        ticket: data.ticket,
        hipodromo: polla.hipodromo,
        costo: polla.costo,
        sobrenombre: clienteSobrenombre.trim(),
        selecciones: { ...selecciones },
        carreras: polla.carreras,
        fecha: new Date().toLocaleString("es-VE"),
        nombreTaquilla: usuario?.nombre_taquilla || "",
        sobrenombreTaquilla: usuario?.sobrenombre || "",
      });
    } else {
      alert(data.error || "Error al vender ticket");
    }
  };

  const getPuesto = (puntos: number) => {
    const unicos = [...new Set(clasificacion.map(p => Number(p.puntos)))].sort((a, b) => b - a);
    return unicos.indexOf(Number(puntos)) + 1;
  };

  const getResultadoBox = (carreraOrden: number, caballoNum: number) => {
    const r = resultados.find((res: any) => Number(res.carrera_orden) === carreraOrden);
    if (!r) return null;
    const p1: number[] = r.primer_lugar || [];
    const p2: number[] = r.segundo_lugar || [];
    const p3: number[] = r.tercer_lugar || [];
    if (p1.includes(caballoNum)) return "1";
    if (p2.includes(caballoNum)) return "2";
    if (p3.includes(caballoNum)) return "3";
    return null;
  };

  const volverLista = () => {
    setPolla(null);
    setMostrarClasificacion(false);
    setClasificacion([]);
    setSelecciones({});
    setClienteSobrenombre("");
  };

  if (!usuario) {
    return (
      <main className="min-h-screen flex items-center justify-center text-white bg-[#0a0f1e]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-amber-400/20 border-t-amber-400 rounded-full animate-spin" />
          <span className="text-gray-500 text-sm">Verificando...</span>
        </div>
      </main>
    );
  }

  const tieneClasifConDatos = clasificacion.length > 0;

  return (
    <main className="min-h-screen p-4 text-white bg-[#0a0f1e]">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Taquilla — Vender Pollas</h1>
        <button onClick={() => router.push("/home")}
          className="px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm font-semibold active:scale-95 transition-all">
          ← Volver
        </button>
      </div>

      {!polla && (
        <div className="space-y-2">
          <p className="text-gray-400 text-sm mb-2">Selecciona una polla para vender:</p>
          {cargando ? (
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <div className="w-4 h-4 border-2 border-amber-400/20 border-t-amber-400 rounded-full animate-spin" />
              Cargando...
            </div>
          ) : pollas.length === 0 ? (
            <p className="text-gray-500 text-sm">No hay pollas registradas</p>
          ) : pollas.map((p: any) => (
            <button key={p.id} onClick={() => seleccionarPolla(p.id)}
              className={`w-full text-left px-4 py-3 rounded-xl border transition-all active:scale-[0.99] ${
                p.activa
                  ? "bg-white/5 border-white/10 hover:bg-white/10"
                  : "bg-gray-800/30 border-gray-700/50 hover:bg-gray-800/50"
              }`}>
              <p className="font-bold text-sm">{p.hipodromo}</p>
              <p className="text-gray-400 text-[10px]">
                Bs. {Number(p.costo).toLocaleString()} · {p.total_tickets || 0} tickets
                {p.activa && conteos[p.id] && <span className="ml-2 text-amber-400 font-mono">{conteos[p.id]}</span>}
                {!p.activa && <span className="ml-2 text-red-400 font-semibold">🔒 Cerrada</span>}
              </p>
            </button>
          ))}
        </div>
      )}

      {polla && mostrarClasificacion && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold">{polla.hipodromo}</h2>
              <p className="text-red-400 text-[10px] font-semibold">🔒 Polla cerrada — Resultados finales</p>
            </div>
            <button onClick={volverLista}
              className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/20 text-white text-xs font-semibold active:scale-95 transition-all">
              ← Lista de pollas
            </button>
          </div>

          {pollaInfoEst && (
            <div className="bg-gradient-to-b from-amber-500/8 to-amber-600/5 border border-amber-400/15 rounded-xl px-4 py-3">
              <div className="flex items-center justify-center gap-8">
                <div className="text-center">
                  <p className="text-amber-300 font-black text-lg tabular-nums">
                    Bs. {(pollaInfoEst.cerrada_en && Number(pollaInfoEst.premio_1) > 0
                      ? Number(pollaInfoEst.premio_1)
                      : Math.floor((pollaInfoEst.total_participantes || 0) * Number(polla.costo) * 0.65)
                    ).toLocaleString()}
                  </p>
                  <p className="text-amber-400/40 text-[9px] uppercase tracking-widest font-medium">1° Lugar</p>
                </div>
                <div className="w-px h-8 bg-amber-400/10" />
                <div className="text-center">
                  <p className="text-gray-300 font-black text-lg tabular-nums">
                    Bs. {(pollaInfoEst.cerrada_en && Number(pollaInfoEst.premio_2) > 0
                      ? Number(pollaInfoEst.premio_2)
                      : Math.floor((pollaInfoEst.total_participantes || 0) * Number(polla.costo) * 0.20)
                    ).toLocaleString()}
                  </p>
                  <p className="text-gray-400/40 text-[9px] uppercase tracking-widest font-medium">2° Lugar</p>
                </div>
              </div>
              <div className="text-center mt-1">
                <span className="text-white/20 text-[10px]">{pollaInfoEst.total_participantes || 0} ticket{(pollaInfoEst.total_participantes || 0) !== 1 ? "s" : ""}</span>
              </div>
            </div>
          )}

          {!tieneClasifConDatos && cargandoClasif && (
            <div className="flex items-center justify-center gap-2 text-gray-500 text-sm py-8">
              <div className="w-4 h-4 border-2 border-amber-400/20 border-t-amber-400 rounded-full animate-spin" />
              Cargando clasificación...
            </div>
          )}

          {!tieneClasifConDatos && !cargandoClasif && (
            <p className="text-gray-500 text-sm text-center py-8">No hay participantes en esta polla</p>
          )}

          {tieneClasifConDatos && (
            <div className="space-y-1.5">
              {carreras.length > 0 && (
                <div className="flex items-center px-3 mb-1">
                  <div className="flex-1 min-w-0" />
                  <div className="flex items-center gap-0.5 mx-3">
                    {carreras.map((c) => (
                      <div key={c.orden} className="w-8 text-center">
                        <p className="text-[10px] text-white/30 font-semibold truncate">{c.nombre}</p>
                      </div>
                    ))}
                  </div>
                  <div className="shrink-0 w-14 text-right">
                    <p className="text-[10px] text-white/20 font-semibold">pts</p>
                  </div>
                </div>
              )}
              {clasificacion.map((p) => {
                const puesto = getPuesto(p.puntos);
                const selecs: any[] = (p.selecciones || [])
                  .sort((a: any, b: any) => a.carrera_orden - b.carrera_orden);
                return (
                  <div key={`${p.usuario_id}-${p.ticket}`}
                    className="rounded-xl border bg-white/[0.02] border-white/[0.06]">
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
                            const resClass = res === "1" ? "border-yellow-400/60 bg-yellow-400/15 text-yellow-300 shadow-[0_0_10px_rgba(255,200,0,0.3)]"
                              : res === "2" ? "border-gray-300/50 bg-gray-300/12 text-gray-200 shadow-[0_0_8px_rgba(200,200,200,0.2)]"
                              : res === "3" ? "border-orange-400/50 bg-orange-400/12 text-orange-300 shadow-[0_0_8px_rgba(255,150,50,0.2)]"
                              : "border-white/10 bg-white/[0.03]";
                            return (
                              <div key={i} className={`w-8 flex flex-col items-center justify-center text-[10px] font-bold rounded border py-0.5 ${resClass}`}>
                                <span className="leading-none">{s.caballo_numero}</span>
                                <span className={`leading-none text-[9px] font-medium mt-0.5 ${Number(s.puntos) > 0 ? "text-emerald-400/80" : "text-white/20"}`}>
                                  {Number(s.puntos)}pts
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        <div className="text-right shrink-0 w-14">
                          <p className="text-white/60 text-xs font-bold">{Number(p.puntos)} <span className="font-normal text-[9px] text-white/30">pts</span></p>
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
        </div>
      )}

      {polla && !mostrarClasificacion && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold">{polla.hipodromo}</h2>
              <p className="text-gray-400 text-[10px]">Bs. {Number(polla.costo).toLocaleString()} por ticket</p>
            </div>
            <div className="flex items-center gap-2">
              {conteo && (
                <span className={`font-mono text-xs font-bold ${conteo === "00:00:00" ? "text-red-400" : "text-amber-300/80"}`}>
                  {conteo}
                </span>
              )}
              <button onClick={() => setPolla(null)}
                className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/20 text-white text-xs font-semibold active:scale-95 transition-all">
                Cambiar Polla
              </button>
            </div>
          </div>

          <div className="bg-gradient-to-b from-amber-500/8 to-amber-600/5 border border-amber-400/15 rounded-xl px-4 py-3">
            <div className="flex items-center justify-center gap-8">
              <div className="text-center">
                <p className="text-amber-300 font-bold text-lg tabular-nums">Bs. {Math.floor(Number(polla.costo) * (polla.total_tickets || 0) * 0.65).toLocaleString()}</p>
                <p className="text-amber-400/40 text-[9px] uppercase tracking-widest font-medium">1° Lugar</p>
              </div>
              <div className="w-px h-8 bg-amber-400/10" />
              <div className="text-center">
                <p className="text-gray-300 font-bold text-lg tabular-nums">Bs. {Math.floor(Number(polla.costo) * (polla.total_tickets || 0) * 0.20).toLocaleString()}</p>
                <p className="text-gray-400/40 text-[9px] uppercase tracking-widest font-medium">2° Lugar</p>
              </div>
            </div>
            <div className="text-center mt-1">
              <span className="text-amber-300/40 text-[10px]">{polla.total_tickets || 0} ticket{(polla.total_tickets || 0) !== 1 ? "s" : ""}</span>
            </div>
          </div>

          <div>
            <label className="text-[10px] text-gray-400 block mb-1">Sobrenombre del Cliente *</label>
            <input value={clienteSobrenombre} onChange={e => setClienteSobrenombre(e.target.value)}
              placeholder="Ej: Juan"
              className="w-full px-3 py-2 rounded-xl bg-black/40 border border-purple-300/40 text-white text-sm placeholder:text-gray-600" />
          </div>

          <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Selecciona 1 caballo por carrera:</p>

          {(polla.carreras || []).map((c: any) => {
            const selected = selecciones[c.orden];
            const retirados: number[] = c.retirados || [];
            return (
              <div key={c.orden} className="rounded-xl px-3 py-2 bg-gray-900/50 border border-gray-700 flex items-center gap-3">
                <p className="text-xs font-bold text-white/80 shrink-0 w-20 truncate">{c.nombre}</p>
                <div className="flex flex-wrap gap-1">
                  {Array.from({ length: c.cantidad_caballos }, (_, i) => i + 1).map(n => {
                    const esRetirado = retirados.includes(n);
                    return (
                      <button key={n} onClick={() => !esRetirado && seleccionarCaballo(c.orden, n)}
                        disabled={esRetirado}
                        className={`w-9 h-9 rounded-lg border text-xs font-bold transition-all
                          ${selected === n
                            ? "bg-emerald-600/60 border-emerald-400/60 text-white shadow-[0_0_12px_rgba(52,211,153,0.3)]"
                            : esRetirado
                              ? "border-red-400/30 bg-red-500/10 text-red-400/50 line-through cursor-not-allowed"
                              : "border-white/10 bg-white/[0.03] text-white/60 hover:border-white/30 hover:text-white/90 active:scale-90"
                          }`}>
                        {n}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div className="flex gap-2 pt-2">
            <button onClick={() => setPolla(null)}
              className="flex-1 py-3 rounded-xl bg-white/10 border border-white/20 text-white text-sm font-semibold active:scale-95 transition-all">
              Cancelar
            </button>
            <button onClick={vender} disabled={enviando}
              className="flex-1 py-3 rounded-xl bg-emerald-600/70 border border-emerald-400/60 text-white font-bold text-sm
                shadow-[0_0_18px_rgba(52,211,153,0.3)] hover:brightness-110 active:scale-95 transition-all
                disabled:opacity-40 disabled:cursor-not-allowed">
              {enviando ? "Vendiendo..." : "Vender Ticket"}
            </button>
          </div>
        </div>
      )}
      {mostrarConfirmacion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          onClick={() => setMostrarConfirmacion(false)}>
          <div onClick={e => e.stopPropagation()}
            className="bg-gray-900 border border-gray-700 rounded-2xl p-5 w-full max-w-sm space-y-4">
            <p className="text-sm font-bold text-center">¿Confirmar venta?</p>
            <div className="bg-gray-800/50 rounded-xl p-3 text-xs space-y-1">
              <p><span className="text-gray-400">Hipódromo:</span> <span className="font-semibold">{polla?.hipodromo}</span></p>
              <p><span className="text-gray-400">Cliente:</span> <span className="font-semibold">{clienteSobrenombre}</span></p>
              <p><span className="text-gray-400">Costo:</span> <span className="font-semibold text-emerald-400">Bs. {Number(polla?.costo || 0).toLocaleString()}</span></p>
              <div className="pt-1">
                <p className="text-gray-400 mb-1">Selecciones:</p>
                {(polla?.carreras || []).map((c: any) => {
                  const cab = selecciones[c.orden];
                  return (
                    <p key={c.orden} className="text-white/70">
                      {c.nombre}: <span className="font-bold text-amber-300">#{cab}</span>
                    </p>
                  );
                })}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setMostrarConfirmacion(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-sm font-semibold active:scale-95 transition-all">
                Cancelar
              </button>
              <button onClick={confirmarVenta}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600/70 border border-emerald-400/60 text-white font-bold text-sm
                  shadow-[0_0_12px_rgba(52,211,153,0.3)] active:scale-95 transition-all">
                Sí, Vender Ticket
              </button>
            </div>
          </div>
        </div>
      )}

      {ticketVendido && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 overflow-y-auto py-4"
          onClick={() => setTicketVendido(null)}>
          <div onClick={e => e.stopPropagation()}
            className="bg-white text-black rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div id="ticket-print" className="p-5 space-y-3">
              <div className="text-center border-b border-gray-300 pb-3">
                <p className="text-[10px] uppercase tracking-widest text-gray-500">NANOSPRINT</p>
                <p className="text-lg font-black">TICKET #{ticketVendido.ticket}</p>
                <p className="text-[10px] text-gray-600 font-semibold mt-0.5">Vendido por: {ticketVendido.sobrenombreTaquilla}</p>
              </div>
              <div className="text-xs space-y-1">
                <p><span className="text-gray-500">Hipódromo:</span> <span className="font-bold">{ticketVendido.hipodromo}</span></p>
                <p><span className="text-gray-500">Cliente:</span> <span className="font-bold">{ticketVendido.sobrenombre}</span></p>
                <p><span className="text-gray-500">Fecha:</span> <span className="font-bold">{ticketVendido.fecha}</span></p>
              </div>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-300">
                    <th className="text-left py-1 font-semibold text-gray-500">Carrera</th>
                    <th className="text-right py-1 font-semibold text-gray-500">Caballo</th>
                  </tr>
                </thead>
                <tbody>
                  {(ticketVendido.carreras || []).sort((a: any, b: any) => a.orden - b.orden).map((c: any) => (
                    <tr key={c.orden} className="border-b border-gray-200">
                      <td className="py-1">{c.nombre}</td>
                      <td className="text-right font-bold text-lg">#{ticketVendido.selecciones[c.orden]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="border-t border-gray-300 pt-2 text-right">
                <p className="text-xs text-gray-500">Total pagado:</p>
                <p className="text-lg font-black">Bs. {Number(ticketVendido.costo).toLocaleString()}</p>
              </div>
              <div className="text-center pt-1">
                <p className="text-[8px] text-gray-400">Presenta este ticket junto a tu cédula al momento del cobro</p>
              </div>
            </div>
            <div className="flex border-t border-gray-200">
              <button onClick={() => window.print()}
                className="flex-1 py-3 text-sm font-bold text-gray-700 hover:bg-gray-100 active:scale-95 transition-all">
                🖨️ Imprimir
              </button>
              <div className="w-px bg-gray-200" />
              <button onClick={() => { setTicketVendido(null); setPolla(null); setSelecciones({}); setClienteSobrenombre("");
                fetch("/api/polla/disponibles").then(r => r.json()).then(d => {
                  if (d.ok) setPollas(d.pollas);
                });
              }}
                className="flex-1 py-3 text-sm font-bold text-gray-700 hover:bg-gray-100 active:scale-95 transition-all">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #ticket-print, #ticket-print * { visibility: visible; }
          #ticket-print { position: fixed; top: 0; left: 0; width: 80mm; padding: 3mm; background: white; color: black; z-index: 9999; }
          @page { margin: 0; size: 80mm auto; }
        }
      `}</style>
    </main>
  );
}
