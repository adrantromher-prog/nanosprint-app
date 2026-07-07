"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminPollasRealizadas() {
  const router = useRouter();
  const [pollas, setPollas] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [pollaExpandida, setPollaExpandida] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/admin/polla/realizadas").then(r => r.json()).then(d => {
      if (d.ok) setPollas(d.pollas);
      setCargando(false);
    }).catch(() => setCargando(false));
  }, []);

  return (
    <main className="min-h-screen p-4 text-white bg-[#0a0f1e]">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Pollas Realizadas</h1>
        <button onClick={() => router.push("/admin/polla/gestionar")}
          className="px-4 py-2 rounded-xl bg-gradient-to-b from-[#003344] to-[#0077AA] border border-cyan-300/70 text-white font-bold shadow-[0_0_18px_rgba(0,255,255,0.5)] hover:shadow-[0_0_28px_rgba(0,255,255,0.9)] active:scale-95 transition-all">
          ← Volver
        </button>
      </div>

      {cargando ? (
        <div className="text-center py-12 text-gray-400">Cargando...</div>
      ) : pollas.length === 0 ? (
        <p className="text-gray-500 text-center py-12">No hay pollas registradas</p>
      ) : (
        <div className="space-y-4">
          {pollas.map((p) => {
            const expandida = pollaExpandida === p.id;
            const costo = Number(p.costo);
            const pozo1 = Math.floor(costo * p.total_tickets * 0.65);
            const pozo2 = Math.floor(costo * p.total_tickets * 0.20);
            return (
              <div key={p.id} className="bg-gray-900/70 border border-gray-700 rounded-2xl overflow-hidden">
                <button onClick={() => setPollaExpandida(expandida ? null : p.id)}
                  className="w-full text-left p-4 hover:bg-gray-800/50 transition-all">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold">Polla #{p.id} — {p.hipodromo}</h3>
                      <div className="flex gap-3 text-[10px] text-gray-400 mt-1">
                        <span>{p.total_tickets} ticket{p.total_tickets !== 1 ? "s" : ""}</span>
                        <span>{p.resultados_count}/{p.carreras_count} resultados</span>
                        {p.cerrada_en && <span className="text-red-400">Cerrada</span>}
                        {!p.cerrada_en && p.activa && <span className="text-green-400">Activa</span>}
                      </div>
                    </div>
                    <div className="text-right text-xs">
                      <p className="text-amber-300 font-bold">1° Bs. {pozo1.toLocaleString()}</p>
                      <p className="text-gray-400">2° Bs. {pozo2.toLocaleString()}</p>
                    </div>
                  </div>
                </button>

                {expandida && (
                  <div className="border-t border-gray-700">
                    {p.tickets.length === 0 ? (
                      <p className="text-gray-500 text-xs p-4">Sin tickets</p>
                    ) : (
                      <div className="divide-y divide-gray-800">
                        {p.tickets.map((t: any, i: number) => (
                          <div key={i} className="px-4 py-2.5 text-xs">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white/70">Ticket #{t.ticket}</span>
                                <span className="text-white/90">{t.sobrenombre}</span>
                                {t.cliente_telefono && <span className="text-gray-500">{t.cliente_telefono}</span>}
                                {t.vendido_por_taquilla && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-400/20">Taquilla</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-right">
                                <span className="text-amber-300 font-semibold">{t.puntos} pts</span>
                                {Number(t.premio) > 0 && (
                                  <span className="text-green-400 font-semibold">+Bs. {Number(t.premio).toLocaleString()}</span>
                                )}
                                {t.pagado && <span className="text-[9px] text-green-400/60">Pagado</span>}
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {(t.selecciones || []).map((s: any, j: number) => (
                                <span key={j}
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${
                                    s.puntos > 0
                                      ? "bg-emerald-500/15 text-emerald-300"
                                      : "bg-white/5 text-white/40"
                                  }`}>
                                  C{s.carrera_orden}: #{s.caballo_numero}{s.puntos > 0 ? ` (${s.puntos}pts)` : ""}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
