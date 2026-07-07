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
  const [clienteTelefono, setClienteTelefono] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [usuario, setUsuario] = useState<any>(null);
  const [mostrarClasificacion, setMostrarClasificacion] = useState(false);
  const [clasificacion, setClasificacion] = useState<any[]>([]);
  const [carreras, setCarreras] = useState<any[]>([]);
  const [resultados, setResultados] = useState<any[]>([]);
  const [pollaInfoEst, setPollaInfoEst] = useState<any>(null);
  const [conteo, setConteo] = useState("");
  const [cargandoClasif, setCargandoClasif] = useState(false);
  const pollaIdRef = useRef<number | null>(null);

  useEffect(() => {
    fetch("/api/me").then(r => r.json()).then(d => {
      if (d.rol === "taquilla") setUsuario(d);
      else window.location.href = "/home";
    }).catch(() => window.location.href = "/home");
    fetch("/api/polla/disponibles").then(r => r.json()).then(d => {
      if (d.ok) setPollas((d.pollas || []).filter((p: any) => p.activa));
      setCargando(false);
    }).catch(() => setCargando(false));
  }, []);

  useEffect(() => {
    if (!polla) return;
    const actualizar = () => {
      const p = polla;
      const ms = p.fecha_cierre ? new Date(p.fecha_cierre).getTime()
        : p.hora_cierre ? (() => { const [h, m] = p.hora_cierre.split(":").map(Number); const c = new Date(); c.setUTCHours(h + 4, m, 0, 0); return c.getTime(); })()
        : 0;
      if (!ms) { setConteo(""); return; }
      const d = ms - Date.now();
      if (d <= 0) { setConteo("00:00:00"); return; }
      const hh = Math.floor(d / 3600000);
      const mm = Math.floor((d % 3600000) / 60000);
      const ss = Math.floor((d % 60000) / 1000);
      setConteo(`${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`);
    };
    actualizar();
    const intervalo = setInterval(actualizar, 1000);
    return () => clearInterval(intervalo);
  }, [polla]);

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
    const res = await fetch(`/api/polla/detalle?id=${id}`).then(r => r.json());
    if (res.ok) { setPolla(res.polla); setSelecciones({}); }
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
    setEnviando(true);
    const res = await fetch("/api/polla/apostar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        polla_id: polla.id,
        selecciones,
        cliente_sobrenombre: clienteSobrenombre.trim(),
        cliente_telefono: clienteTelefono.trim(),
      }),
    });
    const data = await res.json();
    setEnviando(false);
    if (data.ok) {
      alert(`Ticket #${data.ticket} vendido a ${clienteSobrenombre}`);
      setPolla(null);
      setSelecciones({});
      setClienteSobrenombre("");
      setClienteTelefono("");
      fetch("/api/polla/disponibles").then(r => r.json()).then(d => {
        if (d.ok) setPollas(d.pollas);
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
    if (Number(r.primer_lugar) === caballoNum) return "1";
    if (Number(r.segundo_lugar) === caballoNum) return "2";
    if (Number(r.tercer_lugar) === caballoNum) return "3";
    return null;
  };

  const volverLista = () => {
    setPolla(null);
    setMostrarClasificacion(false);
    setClasificacion([]);
    setSelecciones({});
    setClienteSobrenombre("");
    setClienteTelefono("");
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
            <p className="text-gray-500 text-sm">No hay pollas disponibles</p>
          ) : pollas.map((p: any) => (
            <button key={p.id} onClick={() => seleccionarPolla(p.id)}
              className="w-full text-left px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 active:scale-[0.99] transition-all">
              <p className="font-bold text-sm">{p.hipodromo}</p>
              <p className="text-gray-400 text-[10px]">Bs. {Number(p.costo).toLocaleString()} · {p.total_tickets || 0} tickets</p>
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
                          {p.cliente_telefono && <span className="text-gray-500 text-[9px] shrink-0">{p.cliente_telefono}</span>}
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">Sobrenombre del Cliente *</label>
              <input value={clienteSobrenombre} onChange={e => setClienteSobrenombre(e.target.value)}
                placeholder="Ej: Juan"
                className="w-full px-3 py-2 rounded-xl bg-black/40 border border-purple-300/40 text-white text-sm placeholder:text-gray-600" />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">Teléfono del Cliente</label>
              <input value={clienteTelefono} onChange={e => setClienteTelefono(e.target.value)}
                placeholder="Ej: 04121234567"
                className="w-full px-3 py-2 rounded-xl bg-black/40 border border-purple-300/40 text-white text-sm placeholder:text-gray-600" />
            </div>
          </div>

          <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Selecciona 1 caballo por carrera:</p>

          {(polla.carreras || []).map((c: any) => {
            const selected = selecciones[c.orden];
            const retirados: number[] = c.retirados || [];
            return (
              <div key={c.orden} className="rounded-xl p-3 bg-gray-900/50 border border-gray-700">
                <p className="text-xs font-bold text-white/80 mb-2">{c.nombre}</p>
                <div className="flex flex-wrap gap-1.5">
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
    </main>
  );
}
