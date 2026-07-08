"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FaArrowLeft } from "react-icons/fa";

export default function TaquillasPage() {
  const router = useRouter();
  const [rows, setRows] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch("/api/admin/polla/taquillas/movimientos")
      .then(r => r.json())
      .then(d => {
        if (d.ok) setRows(d.taquillas);
        setCargando(false);
      })
      .catch(() => setCargando(false));
  }, []);

  return (
    <main className="min-h-screen p-4 text-white bg-[#0a0f1e]">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push("/admin/polla")}
          className="p-2 rounded-xl bg-white/10 border border-white/20 hover:bg-white/20 transition-all">
          <FaArrowLeft />
        </button>
        <h1 className="text-2xl font-bold">Resumen de Taquillas</h1>
      </div>

      {cargando ? (
        <div className="flex items-center gap-2 text-gray-500 text-sm py-8">
          <div className="w-4 h-4 border-2 border-amber-400/20 border-t-amber-400 rounded-full animate-spin" />
          Cargando...
        </div>
      ) : rows.length === 0 ? (
        <p className="text-gray-500 text-sm">No hay taquillas registradas</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-gray-400 text-[10px] uppercase tracking-wider">
                <th className="text-left py-3 px-3 font-semibold">Taquilla</th>
                <th className="text-center py-3 px-3 font-semibold">Pollas Vendidas</th>
                <th className="text-right py-3 px-3 font-semibold">Monto Venta</th>
                <th className="text-right py-3 px-3 font-semibold">Comisión</th>
                <th className="text-right py-3 px-3 font-semibold">Total Entrega</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any) => (
                <tr key={r.id} className="border-b border-gray-800 hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-3">
                    <span className="font-bold">{r.sobrenombre}</span>
                  </td>
                  <td className="py-3 px-3 text-center font-bold text-amber-300">{r.total_tickets}</td>
                  <td className="py-3 px-3 text-right font-bold text-emerald-400">Bs. {Number(r.total_ventas).toLocaleString()}</td>
                  <td className="py-3 px-3 text-right">
                    <span className="font-bold text-emerald-300">Bs. {Number(r.comision).toLocaleString()}</span>
                    <span className="text-gray-500 text-[10px] ml-1">({r.comision_pct}%)</span>
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-white">Bs. {Number(r.total_entrega).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
