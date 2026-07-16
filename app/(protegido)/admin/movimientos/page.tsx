"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

type Tab = "usuarios" | "taquillas";
type Juego = "remates" | "polla" | "virtuales";
type Filtro = "diario" | "semanal" | "mensual";
type TipoDetalle = "polla" | "virtual";

const FILTRO_LABELS: Record<Filtro, string> = {
  diario: "Día",
  semanal: "Semana",
  mensual: "Mes",
};

const fmtFecha = (r: any, f: Filtro) => {
  if (f === "diario") return (r.dia || "").substring(0, 10);
  if (f === "semanal") return (r.inicio_semana || "").substring(0, 10);
  return (r.mes || "").substring(0, 7);
};

export default function AdminMovimientos() {
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("usuarios");
  const [juego, setJuego] = useState<Juego>("remates");
  const [filtro, setFiltro] = useState<Filtro>("diario");
  const [data, setData] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);

  const [taquillas, setTaquillas] = useState<any[]>([]);
  const [cargandoT, setCargandoT] = useState(false);
  const [taquillaSel, setTaquillaSel] = useState<any>(null);
  const [tipoDetalle, setTipoDetalle] = useState<TipoDetalle>("polla");
  const [filtroT, setFiltroT] = useState<Filtro>("diario");
  const [detalleData, setDetalleData] = useState<any[]>([]);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  // ===== USUARIOS =====
  const cargar = useCallback(async () => {
    if (tab !== "usuarios") return;
    setCargando(true);
    try {
      let url = "";
      if (juego === "remates") url = `/api/admin/movimientos/remates?filter=${filtro}`;
      else if (juego === "polla") url = `/api/admin/movimientos/polla-usuarios?filter=${filtro}`;
      else url = `/api/admin/movimientos/virtuales?filter=${filtro}`;
      const res = await fetch(url).then(r => r.json());
      if (res.ok) setData(res.data || []);
    } catch {}
    setCargando(false);
  }, [tab, juego, filtro]);

  useEffect(() => {
    if (tab === "usuarios") cargar();
  }, [tab, juego, filtro, cargar]);

  // ===== TAQUILLAS =====
  const cargarTaquillas = useCallback(async () => {
    if (tab !== "taquillas") return;
    setCargandoT(true);
    try {
      const res = await fetch("/api/admin/movimientos/taquillas").then(r => r.json());
      if (res.ok) setTaquillas(res.taquillas || []);
    } catch {}
    setCargandoT(false);
  }, [tab]);

  useEffect(() => {
    if (tab === "usuarios") {
      setTaquillaSel(null);
      cargar();
    } else {
      cargarTaquillas();
    }
  }, [tab, cargar, cargarTaquillas]);

  const cargarDetalle = useCallback(async (taqId: number, tipo: TipoDetalle, f: Filtro) => {
    setCargandoDetalle(true);
    try {
      const url = `/api/admin/movimientos/taquillas?id=${taqId}&tipo=${tipo}&filter=${f}`;
      const res = await fetch(url).then(r => r.json());
      if (res.ok) setDetalleData(res.data || []);
    } catch {}
    setCargandoDetalle(false);
  }, []);

  const abrirDetalle = (taq: any, t: TipoDetalle) => {
    setTaquillaSel(taq);
    setTipoDetalle(t);
    setFiltroT("diario");
    cargarDetalle(taq.id, t, "diario");
  };

  useEffect(() => {
    if (taquillaSel) cargarDetalle(taquillaSel.id, tipoDetalle, filtroT);
  }, [filtroT, taquillaSel, tipoDetalle, cargarDetalle]);

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

      <div className="flex gap-2 mb-6 max-w-md mx-auto">
        <button onClick={() => setTab("usuarios")}
          className={"flex-1 py-3 rounded-xl text-sm font-bold transition-all " + (tab === "usuarios"
            ? "bg-blue-600/50 border border-blue-400/50 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]"
            : "bg-white/5 border border-white/10 text-white/50 hover:bg-white/10")}>
          Usuarios
        </button>
        <button onClick={() => setTab("taquillas")}
          className={"flex-1 py-3 rounded-xl text-sm font-bold transition-all " + (tab === "taquillas"
            ? "bg-emerald-600/50 border border-emerald-400/50 text-white shadow-[0_0_15px_rgba(52,211,153,0.3)]"
            : "bg-white/5 border border-white/10 text-white/50 hover:bg-white/10")}>
          Taquillas
        </button>
      </div>

      {/* ==================== TAB USUARIOS ==================== */}
      {tab === "usuarios" && (
        <div className="max-w-5xl mx-auto space-y-4">
          <div className="flex gap-2 flex-wrap">
            {([
              ["remates", "Remates"],
              ["polla", "Polla"],
              ["virtuales", "Carreras Virtuales"],
            ] as [Juego, string][]).map(([j, label]) => (
              <button key={j} onClick={() => { setJuego(j); setFiltro("diario"); }}
                className={"px-5 py-2.5 rounded-xl text-xs font-bold transition-all " + (juego === j
                  ? "bg-amber-500/30 border border-amber-400/50 text-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.25)]"
                  : "bg-white/5 border border-white/10 text-white/50 hover:bg-white/10")}>
                {label}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            {(["diario", "semanal", "mensual"] as Filtro[]).map(f => (
              <button key={f} onClick={() => setFiltro(f)}
                className={"px-4 py-2 rounded-lg text-xs font-semibold transition-all " + (filtro === f
                  ? "bg-white/15 border border-white/30 text-white"
                  : "bg-white/5 border border-white/10 text-white/40 hover:bg-white/10")}>
                {FILTRO_LABELS[f]}
              </button>
            ))}
          </div>

          {cargando ? (
            <div className="flex items-center justify-center gap-2 text-gray-500 text-sm py-12">
              <div className="w-5 h-5 border-2 border-amber-400/20 border-t-amber-400 rounded-full animate-spin" />
              Cargando...
            </div>
          ) : data.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">Sin datos para este período</p>
          ) : (
            <div className="overflow-x-auto bg-gray-900/50 border border-gray-700 rounded-2xl p-3 md:p-4">
              {juego === "remates" && (
                <table className="w-full text-xs md:text-sm">
                  <thead>
                    <tr className="text-gray-400 border-b border-gray-700">
                      <th className="text-left py-2 pr-2">Fecha</th>
                      <th className="text-right px-2">Total Pujas</th>
                      <th className="text-right px-2">Casa (20%)</th>
                      <th className="text-right px-2">Jackpot (5%)</th>
                      <th className="text-right px-2">Referidos (5%)</th>
                      <th className="text-right pl-2">Ganancia Casa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((r: any, i: number) => {
                      const g = Number(r.ganancia_casa);
                      return (
                        <tr key={i} className="border-b border-gray-800/50 hover:bg-white/[0.02]">
                          <td className="py-2.5 pr-2 text-white/70 font-mono">{fmtFecha(r, filtro)}</td>
                          <td className="text-right px-2 text-white/80">Bs. {Number(r.total_pujas).toLocaleString()}</td>
                          <td className="text-right px-2 text-amber-400/80">Bs. {Number(r.casa).toLocaleString()}</td>
                          <td className="text-right px-2 text-yellow-400/70">Bs. {Number(r.jackpot).toLocaleString()}</td>
                          <td className="text-right px-2 text-orange-400/70">Bs. {Number(r.referidos).toLocaleString()}</td>
                          <td className={"text-right pl-2 font-bold " + (g >= 0 ? "text-green-400" : "text-red-400")}>
                            Bs. {g.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
              {juego === "polla" && (
                <table className="w-full text-xs md:text-sm">
                  <thead>
                    <tr className="text-gray-400 border-b border-gray-700">
                      <th className="text-left py-2 pr-2">Fecha</th>
                      <th className="text-right px-2">Tickets</th>
                      <th className="text-right pl-2">Monto Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((r: any, i: number) => (
                      <tr key={i} className="border-b border-gray-800/50 hover:bg-white/[0.02]">
                        <td className="py-2.5 pr-2 text-white/70 font-mono">{fmtFecha(r, filtro)}</td>
                        <td className="text-right px-2 text-white/80">{r.total_tickets}</td>
                        <td className="text-right pl-2 font-bold text-purple-400">Bs. {Number(r.monto_total).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {juego === "virtuales" && (
                <table className="w-full text-xs md:text-sm">
                  <thead>
                    <tr className="text-gray-400 border-b border-gray-700">
                      <th className="text-left py-2 pr-2">Fecha</th>
                      <th className="text-right px-2">Apuestas</th>
                      <th className="text-right px-2">Monto</th>
                      <th className="text-right px-2">Premios</th>
                      <th className="text-right pl-2">Ganancia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((r: any, i: number) => {
                      const g = Number(r.ganancia_casa);
                      return (
                        <tr key={i} className="border-b border-gray-800/50 hover:bg-white/[0.02]">
                          <td className="py-2.5 pr-2 text-white/70 font-mono">{fmtFecha(r, filtro)}</td>
                          <td className="text-right px-2 text-white/80">{r.total_apuestas}</td>
                          <td className="text-right px-2 text-cyan-400/80">Bs. {Number(r.monto_apostado).toLocaleString()}</td>
                          <td className="text-right px-2 text-red-400/80">- Bs. {Number(r.premios_pagados).toLocaleString()}</td>
                          <td className={"text-right pl-2 font-bold " + (g >= 0 ? "text-green-400" : "text-red-400")}>
                            Bs. {g.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB TAQUILLAS ==================== */}
      {tab === "taquillas" && (
        <div className="max-w-5xl mx-auto space-y-4">
          {taquillaSel ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-lg">{taquillaSel.nombre_taquilla || taquillaSel.sobrenombre}</p>
                  <p className="text-gray-400 text-xs">
                    {tipoDetalle === "polla" ? "Pollas vendidas" : "Carreras Virtuales vendidas"}
                  </p>
                </div>
                <button onClick={() => { setTaquillaSel(null); setDetalleData([]); }}
                  className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/20 text-white text-xs font-semibold active:scale-95 transition-all">
                  ← Volver a taquillas
                </button>
              </div>

              {/* Resumen — solo polla o solo virtual, no combinado */}
              {tipoDetalle === "polla" && (() => {
                const pct = Number(taquillaSel.comision_pct) || 10;
                const montoPolla = Number(taquillaSel.monto_polla) || 0;
                const comisionPolla = Math.floor(montoPolla * pct / 100);
                const entregaPolla = montoPolla - comisionPolla;
                return (
                  <div className="bg-gradient-to-b from-purple-600/10 to-purple-900/10 border border-purple-400/20 rounded-xl px-4 py-3 flex items-center justify-center gap-8">
                    <div className="text-center">
                      <p className="text-purple-300 font-bold text-lg">Bs. {montoPolla.toLocaleString()}</p>
                      <p className="text-purple-400/40 text-[9px] uppercase tracking-widest">Monto Pollas</p>
                    </div>
                    <div className="w-px h-8 bg-purple-400/10" />
                    <div className="text-center">
                      <p className="text-emerald-300 font-bold text-lg">{pct}%</p>
                      <p className="text-emerald-400/40 text-[9px] uppercase tracking-widest">Comisión Vendedor</p>
                    </div>
                    <div className="w-px h-8 bg-purple-400/10" />
                    <div className="text-center">
                      <p className="text-amber-300 font-bold text-lg">Bs. {entregaPolla.toLocaleString()}</p>
                      <p className="text-amber-400/40 text-[9px] uppercase tracking-widest">Entrega Admin</p>
                    </div>
                  </div>
                );
              })()}

              {tipoDetalle === "virtual" && (() => {
                const montoVirtual = Number(taquillaSel.monto_virtual) || 0;
                const totalGanancia = detalleData.reduce((s: number, r: any) => s + Number(r.ganancia || 0), 0);
                const totalPremios = detalleData.reduce((s: number, r: any) => s + Number(r.premios_pagados || 0), 0);
                return (
                  <div className="bg-gradient-to-b from-cyan-600/10 to-blue-900/10 border border-cyan-400/20 rounded-xl px-4 py-3 flex items-center justify-center gap-8">
                    <div className="text-center">
                      <p className="text-cyan-300 font-bold text-lg">Bs. {montoVirtual.toLocaleString()}</p>
                      <p className="text-cyan-400/40 text-[9px] uppercase tracking-widest">Monto Apuestas</p>
                    </div>
                    <div className="w-px h-8 bg-cyan-400/10" />
                    <div className="text-center">
                      <p className="text-red-300 font-bold text-lg">Bs. {totalPremios.toLocaleString()}</p>
                      <p className="text-red-400/40 text-[9px] uppercase tracking-widest">Premios Entregados</p>
                    </div>
                    <div className="w-px h-8 bg-cyan-400/10" />
                    <div className="text-center">
                      <p className="text-green-300 font-bold text-lg">Bs. {totalGanancia.toLocaleString()}</p>
                      <p className="text-green-400/40 text-[9px] uppercase tracking-widest">Ganancia</p>
                    </div>
                  </div>
                );
              })()}

              <div className="flex gap-2">
                <button onClick={() => { setTipoDetalle("polla"); setFiltroT("diario"); }}
                  className={"px-4 py-2 rounded-xl text-xs font-bold transition-all " + (tipoDetalle === "polla"
                    ? "bg-purple-600/40 border border-purple-400/50 text-white"
                    : "bg-white/5 border border-white/10 text-white/40 hover:bg-white/10")}>
                  Pollas
                </button>
                <button onClick={() => { setTipoDetalle("virtual"); setFiltroT("diario"); }}
                  className={"px-4 py-2 rounded-xl text-xs font-bold transition-all " + (tipoDetalle === "virtual"
                    ? "bg-cyan-600/40 border border-cyan-400/50 text-white"
                    : "bg-white/5 border border-white/10 text-white/40 hover:bg-white/10")}>
                  Carreras Virtuales
                </button>
              </div>

              <div className="flex gap-2">
                {(["diario", "semanal", "mensual"] as Filtro[]).map(f => (
                  <button key={f} onClick={() => setFiltroT(f)}
                    className={"px-4 py-2 rounded-lg text-xs font-semibold transition-all " + (filtroT === f
                      ? "bg-white/15 border border-white/30 text-white"
                      : "bg-white/5 border border-white/10 text-white/40 hover:bg-white/10")}>
                    {FILTRO_LABELS[f]}
                  </button>
                ))}
              </div>

              {cargandoDetalle ? (
                <div className="flex items-center justify-center gap-2 text-gray-500 text-sm py-12">
                  <div className="w-5 h-5 border-2 border-amber-400/20 border-t-amber-400 rounded-full animate-spin" />
                  Cargando...
                </div>
              ) : detalleData.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">Sin datos para este período</p>
              ) : (
                <div className="overflow-x-auto bg-gray-900/50 border border-gray-700 rounded-2xl p-3 md:p-4">
                  {tipoDetalle === "polla" && (
                    <table className="w-full text-xs md:text-sm">
                      <thead>
                        <tr className="text-gray-400 border-b border-gray-700">
                          <th className="text-left py-2 pr-2">Fecha</th>
                          <th className="text-right px-2">Tickets</th>
                          <th className="text-right px-2">Monto</th>
                          <th className="text-right pl-2">Entrega Admin</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detalleData.map((r: any, i: number) => {
                          const pct = taquillaSel?.comision_pct || 10;
                          const entrega = Math.floor(Number(r.monto_total) * (100 - pct) / 100);
                          return (
                            <tr key={i} className="border-b border-gray-800/50 hover:bg-white/[0.02]">
                              <td className="py-2.5 pr-2 text-white/70 font-mono">{fmtFecha(r, filtroT)}</td>
                              <td className="text-right px-2 text-white/80">{r.total_tickets}</td>
                              <td className="text-right px-2 text-purple-400 font-semibold">Bs. {Number(r.monto_total).toLocaleString()}</td>
                              <td className="text-right pl-2 text-amber-400 font-semibold">Bs. {entrega.toLocaleString()}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                  {tipoDetalle === "virtual" && (
                    <table className="w-full text-xs md:text-sm">
                      <thead>
                        <tr className="text-gray-400 border-b border-gray-700">
                          <th className="text-left py-2 pr-2">Fecha</th>
                          <th className="text-right px-2">Tickets</th>
                          <th className="text-right px-2">Monto</th>
                          <th className="text-right px-2">Premios</th>
                          <th className="text-right pl-2">Ganancia</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detalleData.map((r: any, i: number) => {
                          const g = Number(r.ganancia);
                          return (
                            <tr key={i} className="border-b border-gray-800/50 hover:bg-white/[0.02]">
                              <td className="py-2.5 pr-2 text-white/70 font-mono">{fmtFecha(r, filtroT)}</td>
                              <td className="text-right px-2 text-white/80">{r.total_tickets}</td>
                              <td className="text-right px-2 text-cyan-400/80">Bs. {Number(r.monto_total).toLocaleString()}</td>
                              <td className="text-right px-2 text-red-400/80">- Bs. {Number(r.premios_pagados || 0).toLocaleString()}</td>
                              <td className={"text-right pl-2 font-bold " + (g >= 0 ? "text-green-400" : "text-red-400")}>
                                Bs. {g.toLocaleString()}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-gray-400 text-xs mb-2">Selecciona una taquilla para ver sus movimientos:</p>
              {cargandoT ? (
                <div className="flex items-center justify-center gap-2 text-gray-500 text-sm py-12">
                  <div className="w-5 h-5 border-2 border-amber-400/20 border-t-amber-400 rounded-full animate-spin" />
                  Cargando...
                </div>
              ) : taquillas.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">No hay taquillas registradas</p>
              ) : (
                taquillas.map((t: any) => (
                  <div key={t.id} className="bg-gray-900/50 border border-gray-700 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-bold text-white/90">{t.nombre_taquilla || t.sobrenombre || "—"}</p>
                        <p className="text-[10px] text-gray-500">@{t.sobrenombre} · Comisión {t.comision_pct}%</p>
                      </div>
                      <p className="text-right">
                        <span className="text-[10px] text-gray-500">Total ventas</span><br />
                        <span className="font-bold text-emerald-400 text-sm">Bs. {Number(t.total_ventas).toLocaleString()}</span>
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => abrirDetalle(t, "polla")}
                        className="flex-1 py-2.5 rounded-xl bg-purple-600/30 border border-purple-400/40 text-white text-xs font-bold hover:bg-purple-600/50 active:scale-95 transition-all">
                        Pollas
                      </button>
                      <button onClick={() => abrirDetalle(t, "virtual")}
                        className="flex-1 py-2.5 rounded-xl bg-cyan-600/30 border border-cyan-400/40 text-white text-xs font-bold hover:bg-cyan-600/50 active:scale-95 transition-all">
                        Carreras Virtuales
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </main>
  );
}