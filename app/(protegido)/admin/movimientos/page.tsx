"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

type Tab = "usuarios" | "taquillas";

export default function AdminMovimientos() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("usuarios");
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [taquillas, setTaquillas] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);
  const [expandedUser, setExpandedUser] = useState<number | null>(null);

  const cargarUsuarios = useCallback(async () => {
    setCargando(true);
    try {
      const res = await fetch("/api/admin/movimientos/usuarios").then(r => r.json());
      if (res.ok) setUsuarios(res.usuarios || []);
    } catch {}
    setCargando(false);
  }, []);

  const cargarTaquillas = useCallback(async () => {
    setCargando(true);
    try {
      const res = await fetch("/api/admin/movimientos/taquillas").then(r => r.json());
      if (res.ok) setTaquillas(res.taquillas || []);
    } catch {}
    setCargando(false);
  }, []);

  useEffect(() => {
    if (tab === "usuarios") cargarUsuarios();
    else cargarTaquillas();
  }, [tab, cargarUsuarios, cargarTaquillas]);

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

      {/* Tabs */}
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

      {cargando && (
        <div className="flex items-center justify-center gap-2 text-gray-500 text-sm py-12">
          <div className="w-5 h-5 border-2 border-amber-400/20 border-t-amber-400 rounded-full animate-spin" />
          Cargando...
        </div>
      )}

      {!cargando && tab === "usuarios" && (
        <div className="max-w-5xl mx-auto space-y-2">
          <p className="text-gray-400 text-xs mb-3">Actividad de usuarios en remates, polla y carreras virtuales</p>
          {usuarios.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">No hay actividad de usuarios</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs md:text-sm">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-700">
                    <th className="text-left py-2 pr-2">Usuario</th>
                    <th className="text-right px-2">Remates</th>
                    <th className="text-right px-2">Polla</th>
                    <th className="text-right px-2">Virtuales</th>
                    <th className="text-right pl-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((u: any) => {
                    const total = Number(u.monto_pujado_remates) + Number(u.monto_apostado_polla) + Number(u.monto_apostado_virtual);
                    return (
                      <>
                        <tr key={u.id} onClick={() => setExpandedUser(expandedUser === u.id ? null : u.id)}
                          className="border-b border-gray-800/50 hover:bg-white/[0.02] cursor-pointer">
                          <td className="py-2.5 pr-2">
                            <p className="font-semibold text-white/90">{u.sobrenombre || u.nombre || "—"}</p>
                            <p className="text-[10px] text-gray-500">{u.rol}</p>
                          </td>
                          <td className="text-right px-2 align-middle">
                            <p className="text-white/80">{Number(u.total_pujas_remates) > 0 ? Number(u.total_pujas_remates) + " pujas" : "—"}</p>
                            {Number(u.monto_pujado_remates) > 0 && <p className="text-[10px] text-amber-400/70">Bs. {Number(u.monto_pujado_remates).toLocaleString()}</p>}
                          </td>
                          <td className="text-right px-2 align-middle">
                            <p className="text-white/80">{Number(u.total_apuestas_polla) > 0 ? Number(u.total_apuestas_polla) + " tickets" : "—"}</p>
                            {Number(u.monto_apostado_polla) > 0 && <p className="text-[10px] text-purple-400/70">Bs. {Number(u.monto_apostado_polla).toLocaleString()}</p>}
                          </td>
                          <td className="text-right px-2 align-middle">
                            <p className="text-white/80">{Number(u.total_apuestas_virtual) > 0 ? Number(u.total_apuestas_virtual) + " apuestas" : "—"}</p>
                            {Number(u.monto_apostado_virtual) > 0 && <p className="text-[10px] text-cyan-400/70">Bs. {Number(u.monto_apostado_virtual).toLocaleString()}</p>}
                          </td>
                          <td className="text-right pl-2 align-middle font-bold text-white/90">
                            Bs. {total.toLocaleString()}
                          </td>
                        </tr>
                        {expandedUser === u.id && (
                          <tr key={u.id + "-detail"}>
                            <td colSpan={5} className="bg-white/[0.02] border-b border-gray-800/50">
                              <div className="px-4 py-3 space-y-1 text-[11px]">
                                <p className="text-gray-400"><span className="text-white/60">Saldo actual:</span> Bs. {Number(u.saldo).toLocaleString()}</p>
                                <p className="text-gray-400"><span className="text-white/60">Registrado:</span> {new Date(u.creado_en).toLocaleDateString("es-VE")}</p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {!cargando && tab === "taquillas" && (
        <div className="max-w-5xl mx-auto space-y-2">
          <p className="text-gray-400 text-xs mb-3">Ventas de taquillas en polla y carreras virtuales</p>
          {taquillas.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">No hay taquillas registradas</p>
          ) : (
            <div className="overflow-x-auto">
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