"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface Movimiento {
  id: number;
  tipo: string;
  subtipo: string;
  monto: number;
  descripcion: string;
  fecha: string;
}

export default function HistorialPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const adminUserId = searchParams.get("admin_user_id") || "";

  const [items, setItems] = useState<Movimiento[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filtro, setFiltro] = useState("todos");
  const [loading, setLoading] = useState(true);

  const fetchHistorial = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20", filtro });
      if (adminUserId) params.set("admin_user_id", adminUserId);
      const res = await fetch(`/api/historial?${params}`, { cache: "no-store" });
      const data = await res.json();
      if (data.ok) {
        setItems(data.items);
        setTotalPages(data.totalPages);
        setTotal(data.total);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchHistorial(); }, [page, filtro, adminUserId]);

  const getColor = (tipo: string, subtipo: string) => {
    if (tipo === "deposito") return "text-green-400";
    if (tipo === "retiro") return "text-red-400";
    if (tipo === "puja") return "text-red-400";
    if (tipo === "reembolso") return "text-green-400";
    if (tipo === "premio") return "text-yellow-400";
    if (tipo === "premio_polla") return "text-yellow-400";
    if (tipo === "polla_apuesta") return "text-red-400";
    if (tipo === "comision_referido") return "text-purple-400";
    if (tipo === "liberacion_referido") return "text-cyan-300";
    return "text-white";
  };

  const getSigno = (tipo: string, subtipo: string) => {
    if (tipo === "deposito") return "+";
    if (tipo === "reembolso") return "+";
    if (tipo === "premio") return "+";
    if (tipo === "premio_polla") return "+";
    if (tipo === "comision_referido") return "+";
    if (tipo === "liberacion_referido") return "+";
    return "";
  };

  const filterOpts = [
    { value: "todos", label: "Todos" },
    { value: "depositos", label: "Depósitos" },
    { value: "retiros", label: "Retiros" },
    { value: "pujas", label: "Remates" },
    { value: "pollas", label: "Polla" },
  ];

  return (
    <main className="relative min-h-screen w-full overflow-hidden select-none">
      <div className="absolute inset-0" style={{background: "linear-gradient(135deg, #0a0f1e 0%, #0d1f3c 50%, #091428 100%)"}} />

      <div className="relative z-10 w-full h-full flex flex-col px-5 pt-5 pb-4">
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <button onClick={() => router.back()}
            className="px-4 py-2 rounded-xl bg-white/[0.08] backdrop-blur-xl border border-white/[0.15] text-white font-semibold text-sm hover:bg-white/[0.14] active:scale-95 transition-all"
          >
            ← Volver
          </button>
          <h1 className="text-2xl font-extrabold text-white tracking-wide drop-shadow-[0_0_12px_rgba(0,255,255,0.3)]">
            Historial de Movimientos
          </h1>
          <div className="w-20" />
        </div>

        <div className="flex gap-2 mb-4 flex-shrink-0 overflow-x-auto">
          {filterOpts.map((opt) => (
            <button key={opt.value} onClick={() => { setFiltro(opt.value); setPage(1); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all duration-200 ${
                filtro === opt.value
                  ? "bg-cyan-600/60 text-white border border-cyan-400/60 shadow-[0_0_12px_rgba(0,200,255,0.3)]"
                  : "bg-white/[0.05] text-white/60 border border-white/[0.08] hover:bg-white/[0.1]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 rounded-2xl bg-black/30 backdrop-blur-md border border-white/[0.06]">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-white/50 text-sm">Cargando...</div>
          ) : items.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-white/40 text-sm">Sin movimientos</div>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {items.map((item) => (
                <div key={`${item.tipo}-${item.id}`} className="flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.03] transition-colors">
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-white text-sm font-semibold truncate">{item.descripcion}</span>
                    <span className="text-white/30 text-[10px] mt-0.5 font-mono">
                      {new Date(item.fecha).toLocaleString("en-US", {
                        day: "2-digit", month: "2-digit", year: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <span className={`${getColor(item.tipo, item.subtipo)} font-black text-base ml-4 whitespace-nowrap drop-shadow-[0_0_6px_rgba(0,0,0,0.5)]`}>
                    {getSigno(item.tipo, item.subtipo)}Bs. {Math.abs(item.monto).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-3 flex-shrink-0">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
              className="px-4 py-2 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white text-xs font-bold disabled:opacity-30 hover:bg-white/[0.1] active:scale-95 transition-all"
            >
              ← Anterior
            </button>
            <span className="text-white/50 text-xs font-mono">
              {page} / {totalPages}
            </span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
              className="px-4 py-2 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white text-xs font-bold disabled:opacity-30 hover:bg-white/[0.1] active:scale-95 transition-all"
            >
              Siguiente →
            </button>
          </div>
        )}

        <div className="text-center text-white/20 text-[10px] mt-2 flex-shrink-0 font-mono">
          {total} movimiento{total !== 1 ? "s" : ""} • Página {page} de {totalPages}
        </div>
      </div>
    </main>
  );
}
