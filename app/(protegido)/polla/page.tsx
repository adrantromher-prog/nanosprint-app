"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import useWebSocket from "@/hooks/useWebSocket";

export default function PollaPage() {
  const router = useRouter();
  const [pollasDisponibles, setPollasDisponibles] = useState<any[]>([]);
  const [cargandoLista, setCargandoLista] = useState(true);
  const [polla, setPolla] = useState<any>(null);
  const [usuario, setUsuario] = useState<any>(null);
  const [selecciones, setSelecciones] = useState<{ [carreraOrden: number]: number }>({});
  const [misTickets, setMisTickets] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);
  const [showTickets, setShowTickets] = useState(false);
  const [tiempoRestante, setTiempoRestante] = useState("");
  const [abierto, setAbierto] = useState(true);
  const [clasificacion, setClasificacion] = useState<any[]>([]);
  const [conteos, setConteos] = useState<{ [id: number]: string }>({});
  const [soloMios, setSoloMios] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [animTickets, setAnimTickets] = useState(0);
  const [animPulse, setAnimPulse] = useState(0);
  const prevTicketsRef = useRef(0);
  const prevPollaIdRef = useRef<number | null>(null);
  const animFrameRef = useRef(0);
  const intervaloRef = useRef<any>(null);

  const fetchDisponibles = useCallback(async () => {
    const [resDisponibles, resUser] = await Promise.all([
      fetch("/api/polla/disponibles").then(r => r.json()),
      fetch(`/api/me?_t=${Date.now()}`).then(r => r.json()),
    ]);
    if (resDisponibles.ok) setPollasDisponibles(resDisponibles.pollas);
    if (resUser.nombre) setUsuario(resUser);
    setCargandoLista(false);
  }, []);

  const seleccionarPolla = useCallback(async (pollaId: number) => {
    setCargandoLista(true);
    const [resDetalle, resApuesta, resClasif] = await Promise.all([
      fetch(`/api/polla/detalle?id=${pollaId}`).then(r => r.json()),
      fetch(`/api/polla/mi-apuesta?polla_id=${pollaId}`).then(r => r.json()),
      fetch(`/api/polla/clasificacion?polla_id=${pollaId}`).then(r => r.json()),
    ]);
    if (resDetalle.ok) setPolla(resDetalle.polla);
    if (resApuesta.ok) setMisTickets(resApuesta.apuesta || []);
    if (resClasif.ok) setClasificacion(resClasif.clasificacion);
    setSelecciones({});
    setCargandoLista(false);
  }, []);

  const fetchClasificacion = useCallback(async (pollaId: number) => {
    try {
      const res = await fetch(`/api/polla/clasificacion?polla_id=${pollaId}`);
      const data = await res.json();
      if (data.ok) setClasificacion(data.clasificacion);
    } catch (e) {
      console.error("Error fetching clasificacion:", e);
    }
  }, []);

  useWebSocket(useCallback((event) => {
    if (event.type === "polla_apuesta") {
      fetchDisponibles();
      if (polla && event.polla_id === polla.id) {
        if (event.saldo !== undefined) {
          setUsuario((prev: any) => prev ? { ...prev, saldo: event.saldo } : prev);
        }
        if (event.total_tickets !== undefined) {
          const nuevoTotal = event.total_tickets;
          const actual = prevTicketsRef.current;
          setPolla((p: any) => p ? { ...p, total_tickets: nuevoTotal } : p);
          if (nuevoTotal > actual) {
            setAnimPulse(k => k + 1);
            const start = actual;
            const end = nuevoTotal;
            const duration = 2000;
            const startTime = performance.now();
            prevTicketsRef.current = nuevoTotal;
            const tick = (now: number) => {
              const elapsed = now - startTime;
              const p = Math.min(elapsed / duration, 1);
              const eased = 1 - Math.pow(1 - p, 3);
              setAnimTickets(Math.round(start + (end - start) * eased));
              if (p < 1) animFrameRef.current = requestAnimationFrame(tick);
            };
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
            animFrameRef.current = requestAnimationFrame(tick);
          }
        }
        fetchClasificacion(polla.id);
      }
    }
    if (event.type === "polla_resultados" && polla && event.polla_id === polla.id) {
      seleccionarPolla(polla.id);
    }
    if ((event.type === "polla_cerrada" || event.type === "polla_retiros") && polla && event.polla_id === polla.id) {
      seleccionarPolla(polla.id);
    }
    if (event.type === "polla_creada") {
      fetchDisponibles();
    }
  }, [fetchDisponibles, fetchClasificacion, polla, seleccionarPolla]));

  useEffect(() => { fetchDisponibles(); }, [fetchDisponibles]);

  const msA = (p: any) => {
    if (p.fecha_cierre) return new Date(p.fecha_cierre).getTime();
    if (p.hora_cierre) { const [h,m]=p.hora_cierre.split(":").map(Number);const c=new Date();c.setUTCHours(h+4,m,0,0);return c.getTime(); }
    return 0;
  };
  const diffStr = (ms: number) => {
    const d = ms - Date.now();
    if (d <= 0) return "00:00:00";
    const h = Math.floor(d / 3600000);
    const m = Math.floor((d % 3600000) / 60000);
    const s = Math.floor((d % 60000) / 1000);
    return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  };

  useEffect(() => {
    const actualizarConteos = () => {
      const nuevos: { [id: number]: string } = {};
      for (const p of pollasDisponibles) {
        if (!p.fecha_cierre && !p.hora_cierre) continue;
        nuevos[p.id] = diffStr(msA(p));
      }
      setConteos(nuevos);
    };
    actualizarConteos();
    const intervalo = setInterval(actualizarConteos, 1000);
    return () => clearInterval(intervalo);
  }, [pollasDisponibles]);

  useEffect(() => {
    if (!polla) return;
    if (!polla.activa) { setAbierto(false); setTiempoRestante("00:00:00"); fetchClasificacion(polla.id); return; }
    if (!polla.fecha_cierre && !polla.hora_cierre) return;
    const calcular = () => {
      const ms = msA(polla);
      const d = ms - Date.now();
      if (d <= 0) {
        setAbierto(false);
        setTiempoRestante("00:00:00");
        fetchClasificacion(polla.id);
        if (intervaloRef.current) clearInterval(intervaloRef.current);
      } else {
        setAbierto(true);
        setTiempoRestante(diffStr(ms));
      }
    };
    calcular();
    intervaloRef.current = setInterval(calcular, 1000);
    return () => { clearInterval(intervaloRef.current); };
  }, [polla?.id, polla?.fecha_cierre, polla?.hora_cierre, polla?.activa, fetchClasificacion]);
  // Efecto para animación inicial de tickets al entrar a una polla
  useEffect(() => {
    if (polla?.id && polla.id !== prevPollaIdRef.current) {
      prevPollaIdRef.current = polla.id;
      prevTicketsRef.current = polla.total_tickets || 0;
      setAnimTickets(polla.total_tickets || 0);
    }
  }, [polla?.id, polla?.total_tickets]);



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
    setShowConfirm(false);
    if (data.ok) {
      setSelecciones({});
      alert(`¡Apuesta registrada! Ticket #${data.ticket}`);
      const resMe = await fetch(`/api/me?_t=${Date.now()}`);
      const meData = await resMe.json();
      if (meData.nombre) setUsuario(meData);
      seleccionarPolla(polla.id);
    } else {
      alert(data.error || "Error al registrar apuesta");
    }
  };

  const getPuesto = (puntos: number) => {
    const unicos = [...new Set(clasificacion.map(p => Number(p.puntos)))].sort((a, b) => b - a);
    return unicos.indexOf(Number(puntos)) + 1;
  };

  const getPuestoColor = () => "text-white/60";

  const getResultadoBox = (carreraOrden: number, caballoNum: number) => {
    if (!polla?.resultados) return null;
    const r = polla.resultados.find((res: any) => Number(res.carrera_orden) === carreraOrden);
    if (!r) return null;
    const p1: number[] = r.primer_lugar || [];
    const p2: number[] = r.segundo_lugar || [];
    const p3: number[] = r.tercer_lugar || [];
    if (p1.includes(caballoNum)) return "1";
    if (p2.includes(caballoNum)) return "2";
    if (p3.includes(caballoNum)) return "3";
    return null;
  };

  if (!usuario || cargandoLista) {
    return (
      <main className="min-h-screen flex items-center justify-center text-white">
        <div className="fixed inset-0 bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950" />
        <div className="fixed inset-0 opacity-20"
          style={{
            background: `radial-gradient(ellipse 80% 60% at 50% -20%, rgba(0,255,255,0.15), transparent),
                        radial-gradient(ellipse 60% 50% at 80% 80%, rgba(200,0,255,0.1), transparent),
                        radial-gradient(ellipse 50% 40% at 20% 70%, rgba(255,200,0,0.08), transparent)`
          }}
        />
        <div className="relative flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
          <span className="text-gray-400 text-sm">Cargando...</span>
        </div>
      </main>
    );
  }

  if (!polla) {
    return (
      <main className="relative min-h-screen w-full text-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950" />
        <div className="absolute inset-0 opacity-20"
          style={{
            background: `radial-gradient(ellipse 80% 60% at 50% -20%, rgba(0,255,255,0.15), transparent),
                        radial-gradient(ellipse 60% 50% at 80% 80%, rgba(200,0,255,0.1), transparent),
                        radial-gradient(ellipse 50% 40% at 20% 70%, rgba(255,200,0,0.08), transparent)`
          }}
        />
        <div className="relative z-10 px-3 md:px-4 py-3 max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-cyan-300">Pollas Hípicas</h1>
              <p className="text-cyan-300/60 text-xs font-medium">Selecciona una polla</p>
            </div>
            <div className="flex gap-1.5">
              <button onClick={() => router.push("/home")}
                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/40 font-medium text-xs hover:bg-white/10 active:scale-95 transition-all">
                Salir
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl px-3.5 py-2.5 mb-4">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400/30 to-amber-600/30 border border-amber-400/20 flex items-center justify-center text-white font-bold text-xs">
              {usuario.nombre.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white/80 text-xs font-semibold truncate">{usuario.nombre}</p>
              <p className="text-emerald-400/80 font-bold text-xs">Bs. {Number(usuario.saldo).toLocaleString()}</p>
            </div>
          </div>

          {pollasDisponibles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-400/20 flex items-center justify-center text-2xl">🏇</div>
              <h1 className="text-xl font-bold text-gray-300">No hay Pollas activas</h1>
              <p className="text-gray-500 text-sm text-center">El administrador aún no ha creado una Polla Hípica</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {pollasDisponibles.map((p: any) => {
                const abierta = p.activa && (!p.fecha_cierre && !p.hora_cierre || msA(p) > Date.now());
                return (
                  <button key={p.id}
                    onClick={() => seleccionarPolla(p.id)}
                    className="w-full text-left rounded-xl bg-gradient-to-b from-[#1a1a2e] to-[#111827] border-l-4 border-l-amber-500/60 border border-white/[0.06] p-4 hover:bg-[#1a1a2e] hover:border-l-amber-400/80 hover:border-white/[0.12] hover:shadow-[0_4px_20px_rgba(217,119,6,0.15)] active:scale-[0.98] transition-all">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-white/90 text-base">{p.hipodromo}</span>
                      <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                        abierta
                          ? "bg-emerald-500/10 text-emerald-400/80 border border-emerald-400/20"
                          : "bg-red-500/10 text-red-400/80 border border-red-400/20"
                      }`}>
                        {abierta ? "Abierta" : "Cerrada"}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-white/40 text-sm">
                      <span className={`font-mono font-bold tabular-nums text-base ${abierta ? "text-amber-300/80" : "text-red-400/60"}`}>
                        {abierta ? conteos[p.id] || "--:--:--" : "00:00:00"}
                      </span>
                      <span>Bs. {Number(p.costo).toLocaleString()}</span>
                      <span>{p.total_tickets || 0} tickets</span>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <span className="text-amber-300/70 font-semibold">1° Bs. {Math.floor(Number(p.costo) * (p.total_tickets || 0) * 0.65).toLocaleString()}</span>
                      <span className="text-gray-300/60 font-semibold">2° Bs. {Math.floor(Number(p.costo) * (p.total_tickets || 0) * 0.20).toLocaleString()}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </main>
    );
  }

  const todasConResultado = polla.resultados?.length >= 6;
  const costo = Number(polla.costo);
  const totalSel = Object.keys(selecciones).length;
  const mostrarSeleccion = abierto && !todasConResultado;
  const itemsClasif = soloMios && usuario
    ? clasificacion.filter((p: any) => Number(p.usuario_id) === Number(usuario.id))
    : clasificacion;

  return (
    <main className="relative min-h-screen w-full text-white overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950" />
      <div className="absolute inset-0 opacity-20"
        style={{
          background: `radial-gradient(ellipse 80% 60% at 50% -20%, rgba(0,255,255,0.15), transparent),
                      radial-gradient(ellipse 60% 50% at 80% 80%, rgba(200,0,255,0.1), transparent),
                      radial-gradient(ellipse 50% 40% at 20% 70%, rgba(255,200,0,0.08), transparent)`
        }}
      />

      <div className="relative z-10 px-3 md:px-4 py-3 max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-amber-400/90">Polla Hípica</h1>
            <p className="text-amber-300/60 text-xs font-medium">{polla.hipodromo}</p>
          </div>
          <div className="flex gap-1.5">
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
          {polla.pdf_disponible && (
            <a href={`/api/polla/pdf?id=${polla.id}`} target="_blank" rel="noopener noreferrer"
              className="px-2.5 py-1 rounded-full bg-red-500/15 border border-red-400/30 text-red-300 text-[10px] font-semibold hover:bg-red-500/25 active:scale-95 transition-all shadow-[0_0_12px_rgba(255,50,50,0.3)] hover:shadow-[0_0_18px_rgba(255,50,50,0.5)]">
              Revista
            </a>
          )}
          {misTickets.length > 0 && (
            <button onClick={() => setShowTickets(true)}
              className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-400/20 text-emerald-400/80 text-[10px] font-semibold hover:bg-emerald-500/20 active:scale-95 transition-all">
              {misTickets.length} ticket{misTickets.length !== 1 ? "s" : ""}
            </button>
          )}
        </div>

        <div className={`bg-gradient-to-b from-amber-500/8 to-amber-600/5 border rounded-xl px-4 py-3 mb-3 transition-all duration-700 ${animPulse ? "border-amber-400/40 shadow-[0_0_30px_rgba(255,200,0,0.15)]" : "border-amber-400/15 shadow-none"}`}>
          <div className="flex items-center justify-center gap-8">
            <div className="text-center">
              <p key={animPulse} className={`text-amber-300 font-bold text-lg md:text-xl tabular-nums transition-all duration-300 ${animPulse ? "scale-[1.15]" : ""}`}>Bs. {Math.floor(costo * (animTickets || 0) * 0.65).toLocaleString()}</p>
              <p className="text-amber-400/40 text-[9px] uppercase tracking-widest font-medium">1° Lugar</p>
            </div>
            <div className="w-px h-8 bg-amber-400/10" />
            <div className="text-center">
              <p key={"2"+animPulse} className={`text-gray-300 font-bold text-lg md:text-xl tabular-nums transition-all duration-300 ${animPulse ? "scale-[1.15]" : ""}`}>Bs. {Math.floor(costo * (animTickets || 0) * 0.20).toLocaleString()}</p>
              <p className="text-gray-300/60 font-semibold text-[9px] uppercase tracking-widest font-medium">2° Lugar</p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-3 mt-2 pt-2 border-t border-amber-400/8">
            <span className="text-amber-300/40 text-[10px]">{animTickets || 0} ticket{(animTickets || 0) !== 1 ? "s" : ""}</span>
            <span className="text-white/10 text-[10px]">·</span>
            <span className="text-amber-300/40 text-[10px]">Bs. {costo.toLocaleString()} c/u</span>
          </div>
        </div>

        {(polla.fecha_cierre || polla.hora_cierre) && (
          <div className={`rounded-xl px-4 py-2 mb-3 text-center border ${
            !abierto
              ? "bg-red-900/20 border-red-400/20"
              : "bg-amber-500/8 border-amber-400/15"
          }`}>
            <p className={`font-bold text-lg tabular-nums tracking-wider ${
              !abierto ? "text-red-400" : "text-amber-300"
            }`}>
              {!abierto ? "CERRADO" : tiempoRestante}
            </p>
            <p className="text-white/30 text-[10px] font-medium">
              {!abierto ? "Tiempo de apuestas terminado" : "Tiempo restante para apostar"}
            </p>
          </div>
        )}

        {!abierto ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-white/60">Clasificación</h2>
              <div className="flex gap-1.5">
                {!polla.activa && (
                  <button onClick={() => fetchClasificacion(polla.id)}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-gradient-to-r from-emerald-500/30 to-teal-600/30 border border-emerald-400/50 text-emerald-300 shadow-[0_0_12px_rgba(0,200,150,0.2)] hover:shadow-[0_0_20px_rgba(0,200,150,0.5)] hover:border-emerald-300/70 active:scale-95 transition-all duration-300">
                    Actualizar Polla
                  </button>
                )}
                {usuario && clasificacion.some((p: any) => Number(p.usuario_id) === Number(usuario.id)) && (
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
            </div>
            {itemsClasif.length === 0 ? (
              <p className="text-center py-8 text-white/20 text-sm">{soloMios ? "No tienes tickets en esta polla" : "Aún no hay participantes"}</p>
            ) : (
              <>
                {polla.carreras && polla.carreras.length > 0 && (
                  <div className="flex items-center px-3 mb-1">
                    <div className="flex-1 min-w-0" />
                    <div className="flex items-center gap-0.5 mx-3">
                      {polla.carreras.map((c: any) => (
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
                {itemsClasif.map((p: any) => {
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
                            {selecs.map((s: any, i: number) => {
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
              </>
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
                            <span className="text-[10px] font-bold text-amber-400/70">{carrera.nombre}</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {caballos.map((num) => {
                              const selected = seleccionLocal === num;
                              const esRetirado = retirados.includes(num);

                              return (
                                <button key={num}
                                  onClick={() => !esRetirado && seleccionarCaballo(carrera.orden, num)}
                                  disabled={esRetirado}
                                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl border-2 flex items-center justify-center text-xs transition-all duration-150 disabled:opacity-100
                                    ${esRetirado
                                      ? "border-white/30 bg-gradient-to-br from-red-600 to-red-800 text-white font-black cursor-default"
                                      : selected
                                        ? "border-cyan-400 bg-cyan-500/20 text-white font-black scale-110 shadow-[0_0_16px_rgba(0,255,255,0.35)] shadow-cyan-500/20"
                                        : "border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] text-white/50 font-bold hover:border-cyan-400/50 hover:bg-cyan-500/10 hover:text-white hover:shadow-[0_0_12px_rgba(0,255,255,0.15)]"
                                    }
                                    ${esRetirado ? "cursor-default" : "cursor-pointer active:scale-90"}`}>
                                  {esRetirado ? <span className="flex flex-col items-center leading-none"><span className="text-[9px] opacity-70">{num}</span><span className="text-sm -mt-0.5">✕</span></span> : num}
                                </button>
                              );
                            })}
                          </div>
                          {resultado && (
                            <div className="flex flex-wrap gap-1 shrink-0 mt-1">
                              {(resultado.primer_lugar || []).map((n: number) => <span key={n} className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300/70 border border-amber-400/15 text-[9px] font-medium">1° #{n}</span>)}
                              {(resultado.segundo_lugar || []).map((n: number) => <span key={n} className="px-1.5 py-0.5 rounded bg-gray-400/10 text-gray-300/70 border border-gray-400/15 text-[9px] font-medium">2° #{n}</span>)}
                              {(resultado.tercer_lugar || []).map((n: number) => <span key={n} className="px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-300/70 border border-orange-400/15 text-[9px] font-medium">3° #{n}</span>)}
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

                <button onClick={() => setShowConfirm(true)} disabled={totalSel !== 6}
                  className="mt-3 w-full py-3 rounded-xl bg-amber-500/20 border border-amber-400/30 text-amber-300 font-semibold text-sm
                    hover:bg-amber-500/30 active:scale-[0.98] transition-all duration-150
                    disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-amber-500/20 disabled:active:scale-100">
                  {totalSel === 6
                    ? `Confirmar — Bs. ${costo.toLocaleString()}`
                    : `Selecciona ${6 - totalSel} más`}
                </button>
              </>
            )}
          </>
        )}

        {abierto && misTickets.length > 0 && (
          <div className="mt-4 bg-white/[0.02] border border-white/[0.06] rounded-xl p-3">
            <p className="text-white/30 text-[11px] text-center font-medium">
              Tienes {misTickets.length} ticket{misTickets.length !== 1 ? "s" : ""} activo{misTickets.length !== 1 ? "s" : ""}. Puedes comprar más.
            </p>
          </div>
        )}

        {showConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
            onClick={() => !cargando && setShowConfirm(false)}>
            <div className="bg-[#0a0b0e] border border-white/[0.08] rounded-2xl w-full max-w-sm"
              onClick={e => e.stopPropagation()}>
              <div className="p-4 border-b border-white/[0.06]">
                <h3 className="text-sm font-bold text-white/80 text-center">Confirmar Apuesta</h3>
              </div>
              <div className="p-4 space-y-2">
                <p className="text-white/40 text-[11px] text-center mb-2">Ticket — {polla.hipodromo}</p>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {(polla.carreras || []).map((c: any) => {
                    const sel = selecciones[c.orden];
                    return (
                      <div key={c.orden} className="flex flex-col items-center gap-0.5">
                        <span className="text-[9px] text-white/30 font-medium">{c.nombre}</span>
                        <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-cyan-500/20 border border-cyan-400/40 text-white font-bold text-sm">
                          {sel || "?"}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t border-white/[0.06]">
                  <span className="text-white/40 text-xs">Total:</span>
                  <span className="text-amber-300 font-black text-lg">Bs. {costo.toLocaleString()}</span>
                </div>
              </div>
              <div className="flex gap-2 p-4 pt-0">
                <button onClick={() => setShowConfirm(false)} disabled={cargando}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/50 font-semibold text-xs hover:bg-white/10 active:scale-95 transition-all disabled:opacity-30">
                  Cancelar
                </button>
                <button onClick={enviarApuesta} disabled={cargando}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500/20 border border-amber-400/30 text-amber-300 font-semibold text-xs hover:bg-amber-500/30 active:scale-95 transition-all disabled:opacity-30">
                  {cargando ? "Procesando..." : "Confirmar"}
                </button>
              </div>
            </div>
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
