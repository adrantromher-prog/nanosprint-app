"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

type Tab = "usuarios" | "taquillas";
type Juego = "remates" | "polla" | "virtuales";
type Filtro = "diario" | "semanal" | "mensual";

const FILTRO_LABELS: Record<Filtro, string> = {
  diario: "Día",
  semanal: "Semana",
  mensual: "Mes",
};

export default function AdminMovimientos() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("usuarios");
  const [juego, setJuego] = useState<Juego>("remates");
  const [filtro, setFiltro] = useState<Filtro>("diario");
  const [data, setData] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);

  // Taquillas state
  const [taquillas, setTaquillas] = useState<any[]>([]);
  const [cargandoT, setCargandoT] = useState(false);

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

  const cargarTaquillas = useCallback(async () => {
    setCargandoT(true);
    try {
      const res = await fetch("/api/admin/movimientos/taquillas").then(r => r.json());
      if (res.ok) setTaquillas(res.taquillas || []);
    } catch {}
    setCargandoT(false);
  }, []);

  useEffect(() => {
    if (tab === "usuarios") cargar();
    else cargarTaquillas();
  }, [tab, juego, filtro, cargar, cargarTaquillas]);

  const fmtFecha = (r: any) => {
    if (filtro === "diario") return (r.dia || "").substring(0, 10);
    if (filtro === "semanal") return (r.inicio_semana || "").substring(0, 10);
    return (r.mes || "").substring(0, 7);
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

      {/* Tabs principales */}
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

      {/* ========= TAB USUARIOS ========= */}
      {tab === "usuarios" && (
        <div className="max-w-5xl mx-auto space-y-4">
          {/* Sub-botones de juegos */}
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

          {/* Filtros día/semana/mes */}
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
                          <td className="py-2.5 pr-2 text-white/70 font-mono">{fmtFecha(r)}</td>
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
                        <td className="py-2.5 pr-2 text-white/70 font-mono">{fmtFecha(r)}</td>
                        <td className="text-right px-2 text-white/80">{r.total_tickets}</td>
                        <td className="text-right pl-2 font-bold text-purple-400">
                          Bs. {Number(r.monto_total).toLocaleString()}
                        </td>
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
                          <td className="py-2.5 pr-2 text-white/70 font-mono">{fmtFecha(r)}</td>
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

      {/* ========= TAB TAQUILLAS ========= */}
      {tab === "taquillas" && (
        <div className="max-w-5xl mx-auto space-y-2">
          <p className="text-gray-400 text-xs mb-3">Ventas de taquillas en polla y carreras virtuales</p>
          {cargandoT ? (
            <div className="flex items-center justify-center gap-2 text-gray-500 text-sm py-12">
              <div className="w-5 h-5 border-2 border-amber-400/20 border-t-amber-400 rounded-full animate-spin" />
              Cargando...
            </div>
          ) : taquillas.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">No hay taquillas registradas</p>
          ) : (
            <div className="overflow-x-auto bg-gray-900/50 border border-gray-700 rounded-2xl p-3 md:p-4">
              <table className="w-full text-xs md:text-sm">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-700">
                    <th className="text-left py-2 pr-2">Taquilla</th>
                    <th className="text-right px-2">Pollas</th>
                    <th className="text-right px-2">Virtuales</th>
                    <th className="text-right px-2">Total Ventas</th>
                    <th className="text-right px-2">Comisión</th>
                    <th className="text-right pl-2">Entrega Admin</th>
                  </tr>
                </thead>
                <tbody>
                  {taquillas.map((t: any) => (
                    <tr key={t.id} className="border-b border-gray-800/50 hover:bg-white/[0.02]">
                      <td className="py-2.5 pr-2">
                        <p className="font-semibold text-white/90">{t.nombre_taquilla || t.sobrenombre || "—"}</p>
                        <p className="text-[10px] text-gray-500">{t.sobrenombre}</p>
                      </td>
                      <td className="text-right px-2 align-middle">
                        <p className="text-white/80">{Number(t.total_tickets_polla)} tickets</p>
                        <p className="text-[10px] text-purple-400/70">Bs. {Number(t.monto_polla).toLocaleString()}</p>
                      </td>
                      <td className="text-right px-2 align-middle">
                        <p className="text-white/80">{Number(t.total_tickets_virtual)} tickets</p>
                        <p className="text-[10px] text-cyan-400/70">Bs. {Number(t.monto_virtual).toLocaleString()}</p>
                      </td>
                      <td className="text-right px-2 align-middle font-bold text-white/90">
                        Bs. {Number(t.total_ventas).toLocaleString()}
                      </td>
                      <td className="text-right px-2 align-middle">
                        <p className="text-emerald-400 font-semibold">Bs. {Number(t.comision).toLocaleString()}</p>
                        <p className="text-[10px] text-gray-500">({t.comision_pct}%)</p>
                      </td>
                      <td className="text-right pl-2 align-middle font-bold text-amber-400">
                        Bs. {Number(t.total_entrega).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </main>
  );
}