"use client";

import { useState, useEffect, useCallback } from "react";

const coloresHex = ["#dc2626", "#e5e7eb", "#2563eb", "#facc15", "#16a34a", "#0f172a"];
const coloresText = ["#fff", "#0f172a", "#fff", "#0f172a", "#fff", "#fff"];

type Ticket = {
  id: number;
  carrera_id: number;
  ticket: string;
  caballo_numero: number;
  monto: number;
  cuota: number;
  pagado: boolean;
  premio_pagado: number;
  creado_en: string;
  ganador: number | null;
  es_ganador: boolean;
  premio: number;
};

export default function VentaPage() {
  const [carrera, setCarrera] = useState<any>(null);
  const [montos, setMontos] = useState<number[]>([0, 0, 0, 0, 0, 0]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const abierto = carrera?.estado === "apuestas" && (carrera.tiempoRestante ?? 0) > 0;
  const [popup, setPopup] = useState<{ caballo: number; monto: number; cuota: number } | null>(null);
  const [lastTicket, setLastTicket] = useState<{ ticket: string; caballo: number; monto: number; cuota: number; carrera: number } | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [statsFilter, setStatsFilter] = useState("daily");
  const [stats, setStats] = useState<any>(null);
  const [mensaje, setMensaje] = useState("");

  const fetchCarrera = useCallback(async () => {
    try {
      const res = await fetch("/api/carrera", { cache: "no-store" });
      const data = await res.json();
      if (data.estado) setCarrera(data);
    } catch {}
  }, []);

  const fetchTickets = useCallback(async () => {
    try {
      const res = await fetch("/api/carrerasvirtuales/venta", { cache: "no-store" });
      const data = await res.json();
      if (data.ok) setTickets(data.tickets);
    } catch {}
  }, []);

  useEffect(() => { fetchCarrera(); fetchTickets(); }, [fetchCarrera, fetchTickets]);
  useEffect(() => { const id = setInterval(fetchCarrera, 3000); return () => clearInterval(id); }, [fetchCarrera]);
  useEffect(() => { const id = setInterval(fetchTickets, 5000); return () => clearInterval(id); }, [fetchTickets]);

  const abrirPopup = (caballo: number) => {
    if (!abierto) { setMensaje("La carrera est\u00e1 cerrada, espera la pr\u00f3xima"); return; }
    const monto = montos[caballo - 1];
    if (monto <= 0) return;
    const cuota = carrera?.cuotas?.[caballo - 1];
    if (!cuota) return;
    setPopup({ caballo, monto, cuota });
    setMensaje("");
  };

  const confirmarVenta = async () => {
    if (!popup || !carrera) return;
    try {
      const res = await fetch("/api/carrerasvirtuales/venta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ carrera_id: carrera.numeroCarrera, caballo_numero: popup.caballo, monto: popup.monto, cuota: popup.cuota, carrera_num: carrera.numeroCarrera }),
      });
      const data = await res.json();
      if (data.ok) {
        const t = { ticket: data.ticket.ticket, caballo: popup.caballo, monto: popup.monto, cuota: popup.cuota, carrera: carrera.numeroCarrera };
        setLastTicket(t);
        setMontos((prev) => { const n = [...prev]; n[popup.caballo - 1] = 0; return n; });
        setPopup(null);
        fetchTickets();
        setTimeout(() => window.print(), 300);
      } else {
        setMensaje(data.error || "Error");
      }
    } catch {
      setMensaje("Error de conexi\u00f3n");
    }
  };

  const pagarTicket = async (ticketId: number) => {
    try {
      const res = await fetch("/api/carrerasvirtuales/venta/pagar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket_id: ticketId }),
      });
      const data = await res.json();
      if (data.ok) {
        setMensaje(`Pagado Bs. ${data.premio.toLocaleString()}`);
        fetchTickets();
      } else {
        setMensaje(data.error || "Error");
      }
    } catch {
      setMensaje("Error de conexi\u00f3n");
    }
  };

  const fetchStats = async (filtro?: string) => {
    const f = filtro || statsFilter;
    try {
      const res = await fetch(`/api/carrerasvirtuales/venta/stats?filter=${f}`, { cache: "no-store" });
      const data = await res.json();
      if (data.ok) setStats(data.stats);
    } catch {}
  };

  return (
    <div className="fixed inset-0 text-white flex"
      style={{ background: "linear-gradient(135deg, #05080f 0%, #070d1a 50%, #040a12 100%)" }}>

      {/* IZQUIERDA — APUESTAS */}
      <div className="flex-1 flex flex-col p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold">Venta Carreras Virtuales</h1>
            {carrera && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-white/40 text-xs">Carrera #{String(carrera.numeroCarrera).padStart(4, "0")}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${abierto ? "bg-green-500/20 text-green-400 border border-green-400/30" : "bg-red-500/20 text-red-400 border border-red-400/30"}`}>
                  {abierto ? `Abierto ${carrera.tiempoRestante}s` : "Cerrado"}
                </span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setShowStats(true); fetchStats(); }}
              className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/50 text-xs hover:bg-white/10 active:scale-95 transition-all">
              Estadísticas
            </button>
            <button onClick={() => window.location.href = "/home"}
              className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/50 text-xs hover:bg-white/10 active:scale-95 transition-all">
              Volver
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 flex-1 content-start">
          {[1,2,3,4,5,6].map((num) => {
            const cuota = carrera?.cuotas?.[num - 1];
            return (
              <div key={num} className="rounded-xl border border-white/10 overflow-hidden bg-white/[0.03] relative">
                {!abierto && (
                  <div className="absolute inset-0 z-10 bg-black/60 flex items-center justify-center backdrop-blur-[2px]">
                    <span className="text-red-500 font-black opacity-60" style={{ fontSize: "5rem" }}>✕</span>
                  </div>
      )}

      {/* TICKET PARA IMPRIMIR */}
      {lastTicket && (
        <div className="fixed" style={{ position: "absolute", left: "-9999px", top: 0 }}>
          <div id="print-ticket" className="bg-white text-black p-3" style={{ width: "72mm", fontFamily: "'Courier New', monospace", fontSize: "10px", lineHeight: "1.2" }}>
            <div className="text-center" style={{ borderBottom: "1px dashed #999", paddingBottom: "4px", marginBottom: "4px" }}>
              <p style={{ fontSize: "14px", fontWeight: "bold", letterSpacing: "2px", margin: "0" }}>NANOSPRINT</p>
            </div>
            <div className="text-center" style={{ marginBottom: "4px" }}>
              <p style={{ fontSize: "8px", color: "#888", margin: "0" }}>CARRERA #{String(lastTicket.carrera).padStart(4, "0")}</p>
            </div>
            <div style={{ borderTop: "1px dashed #999", borderBottom: "1px dashed #999", padding: "4px 0", marginBottom: "4px", textAlign: "center" }}>
              <p style={{ fontSize: "10px", color: "#444", margin: "0 0 1px" }}>Caballo {lastTicket.caballo}</p>
              <p style={{ fontSize: "14px", fontWeight: "bold", margin: "0" }}>Bs. {lastTicket.monto.toLocaleString()} <span style={{ fontWeight: "normal", fontSize: "12px" }}>x {lastTicket.cuota.toFixed(2)}</span></p>
            </div>
            <div style={{ marginBottom: "4px", fontSize: "8px", color: "#666", textAlign: "center" }}>
              <p style={{ margin: "0" }}>Ticket: <span style={{ fontWeight: "bold", color: "#000" }}>{lastTicket.ticket}</span></p>
            </div>
            <div style={{ borderTop: "1px dashed #999", paddingTop: "3px", textAlign: "center", fontSize: "7px", color: "#aaa" }}>
              <p style={{ margin: "0" }}>Premio: Bs. {(lastTicket.monto * lastTicket.cuota).toLocaleString()}</p>
              <p style={{ margin: "2px 0 0" }}>==============================</p>
              <p style={{ margin: "1px 0 0" }}>Mucha suerte</p>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          @page { margin: 0; size: 72mm auto; }
          body * { visibility: hidden; }
          #print-ticket, #print-ticket * { visibility: visible; }
          #print-ticket { position: fixed; left: 0; top: 0; width: 72mm; padding: 4mm; }
        }
      `}</style>
                <div className="h-10 flex items-center justify-center gap-1.5 text-sm font-bold"
                  style={{ backgroundColor: coloresHex[num - 1], color: coloresText[num - 1] }}>
                  <span>Caballo {num}</span>
                </div>
                <div className="p-3 space-y-2">
                  <p className="text-center text-lg font-extrabold text-cyan-400">x{cuota?.toFixed(2) || "—"}</p>
                  <div className="flex gap-2">
                    <input type="number" value={montos[num - 1] || ""}
                      onChange={(e) => {
                        const n = [...montos]; n[num - 1] = parseInt(e.target.value) || 0; setMontos(n);
                      }}
                      placeholder="Bs."
                      className="flex-1 px-2 py-1.5 rounded-lg bg-black/50 border border-white/10 text-white text-sm focus:outline-none focus:border-white/30 placeholder-white/30 w-0"
                    />
                    <button onClick={() => abrirPopup(num)}
                      disabled={!abierto || !montos[num - 1] || montos[num - 1] <= 0}
                      className="px-3 py-1.5 rounded-lg bg-cyan-600/70 border border-cyan-400/50 text-white font-bold text-xs hover:brightness-110 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                      Vender
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {mensaje && (
          <div className="mt-3 text-center text-sm bg-white/5 rounded-xl py-2 px-4 border border-white/10">
            {mensaje}
          </div>
        )}
      </div>

      {/* DERECHA — TICKETS */}
      <div className="w-[380px] border-l border-white/10 flex flex-col">
        <div className="p-3 border-b border-white/10">
          <h2 className="text-sm font-bold">Tickets vendidos ({tickets.length})</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {tickets.map((t) => {
            const ganador = t.es_ganador;
            const pagado = t.pagado;
            const bgColor = pagado ? "bg-emerald-900/40 border-emerald-600/40"
              : ganador ? "bg-green-600/30 border-green-500/50"
              : "bg-white/[0.03] border-white/[0.06]";
            return (
              <div key={t.id}
                className={`rounded-lg border ${bgColor} px-3 py-2 transition-all text-xs ${ganador && !pagado ? "animate-pulse" : ""}`}>
                <div className="flex justify-between items-center">
                  <span className="font-mono text-white/60">{t.ticket}</span>
                  {ganador && !pagado && (
                    <button onClick={() => pagarTicket(t.id)}
                      className="text-[10px] font-bold bg-green-500/30 text-green-300 px-2 py-0.5 rounded border border-green-400/40 hover:bg-green-500/50 active:scale-95 transition-all">
                      Pagar Bs. {t.premio.toLocaleString()}
                    </button>
                  )}
                  {pagado && <span className="text-[10px] font-bold bg-emerald-600/40 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30">✔ PAGADO</span>}
                  {!ganador && !pagado && (
                    <span className="font-bold text-white/80">Caballo {t.caballo_numero}</span>
                  )}
                </div>
                <div className="flex justify-between items-center mt-0.5">
                  <span className="text-white/40">Bs. {t.monto.toLocaleString()} · x{t.cuota}</span>
                  <span className={`font-semibold ${ganador ? (pagado ? "text-white/40" : "text-green-400") : "text-white/30"}`}>
                    {pagado ? `Pagado Bs. ${t.premio_pagado.toLocaleString()}` : ganador ? `Premio Bs. ${t.premio.toLocaleString()}` : "—"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* POPUP CONFIRMACIÓN */}
      {/* ESTADÍSTICAS MODAL */}
      {showStats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowStats(false)}>
          <div className="bg-[#0a1628] border border-white/10 rounded-2xl shadow-2xl shadow-black/40 p-6 w-[380px] max-h-[80vh] overflow-y-auto mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-lg">Estadísticas</h3>
              <button onClick={() => setShowStats(false)} className="text-white/40 hover:text-white text-xl">&times;</button>
            </div>

            <div className="flex gap-2 mb-4">
              {["daily", "weekly", "monthly"].map((f) => (
                <button key={f} onClick={() => { setStatsFilter(f); fetchStats(f); }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    statsFilter === f ? "bg-cyan-600/40 text-cyan-300 border border-cyan-400/50" : "bg-white/5 text-white/40 border border-white/10 hover:bg-white/10"
                  }`}>
                  {f === "daily" ? "Diario" : f === "weekly" ? "Semanal" : "Mensual"}
                </button>
              ))}
            </div>

            {stats ? (
              <div className="space-y-3">
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-white/50">Vendidos</span>
                    <span className="font-bold text-white">{stats.total_vendidos} tickets</span>
                  </div>
                  <div className="flex justify-between text-xs mt-1">
                    <span className="text-white/50">Monto total</span>
                    <span className="font-bold text-white">Bs. {stats.total_monto.toLocaleString()}</span>
                  </div>
                </div>
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-white/50">Pagados</span>
                    <span className="font-bold text-emerald-300">Bs. {stats.total_premios.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs mt-1">
                    <span className="text-white/50">Pendiente</span>
                    <span className="font-bold text-yellow-300">Bs. {stats.pendiente.toLocaleString()}</span>
                  </div>
                </div>
                <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-xl p-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-emerald-300/60">Ganancia de la casa</span>
                    <span className="font-extrabold text-emerald-300 text-base">Bs. {stats.ganancia_casa.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-white/30 text-sm">Cargando...</div>
            )}
          </div>
        </div>
      )}

      {popup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setPopup(null)}>
          <div className="bg-[#0a1628] border border-white/10 rounded-2xl shadow-2xl shadow-black/40 p-6 w-[320px] mx-4" onClick={(e) => e.stopPropagation()}>
            <p className="text-white text-lg font-bold text-center mb-4">Confirmar venta</p>
            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between"><span className="text-white/50">Caballo</span><span className="font-semibold">{popup.caballo}</span></div>
              <div className="flex justify-between"><span className="text-white/50">Monto</span><span className="font-semibold">Bs. {popup.monto.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-white/50">Cuota</span><span className="font-semibold text-cyan-400">x{popup.cuota}</span></div>
              <div className="border-t border-white/10 pt-2 flex justify-between">
                <span className="text-white/50">Premio si gana</span>
                <span className="font-bold text-green-400">Bs. {(popup.monto * popup.cuota).toLocaleString()}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setPopup(null)}
                className="flex-1 py-2.5 rounded-xl text-white font-bold text-sm bg-red-600/80 border border-white/10 active:scale-95 transition-all">
                Cancelar
              </button>
              <button onClick={confirmarVenta}
                className="flex-1 py-2.5 rounded-xl text-white font-bold text-sm bg-green-600/80 border border-white/10 active:scale-95 transition-all">
                Confirmar y vender
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
