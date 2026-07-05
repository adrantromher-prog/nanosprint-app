"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminPollaGestionar() {
  const router = useRouter();
  const [pollas, setPollas] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [eliminando, setEliminando] = useState<number | null>(null);
  const [conteos, setConteos] = useState<{ [id: number]: string }>({});

  const fetchPollas = async () => {
    setCargando(true);
    const res = await fetch("/api/admin/polla/lista");
    const data = await res.json();
    if (data.ok) setPollas(data.pollas);
    setCargando(false);
  };

  useEffect(() => { fetchPollas(); }, []);

  useEffect(() => {
    const actualizar = () => {
      const nuevos: { [id: number]: string } = {};
      for (const p of pollas) {
        if (!p.hora_cierre) continue;
        const [horas, minutos] = p.hora_cierre.split(":").map(Number);
        const ahora = new Date();
        const minutosAhora = (ahora.getUTCHours() * 60 + ahora.getUTCMinutes() - 240 + 1440) % 1440;
        if (horas * 60 + minutos <= minutosAhora) {
          nuevos[p.id] = "00:00:00";
        } else {
          const cierre = new Date();
          cierre.setUTCHours(horas + 4, minutos, 0, 0);
          const diff = cierre.getTime() - ahora.getTime();
          const h = Math.floor(diff / 3600000);
          const m = Math.floor((diff % 3600000) / 60000);
          const s = Math.floor((diff % 60000) / 1000);
          nuevos[p.id] = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
        }
      }
      setConteos(nuevos);
    };
    actualizar();
    const intervalo = setInterval(actualizar, 1000);
    return () => clearInterval(intervalo);
  }, [pollas]);

  const eliminarPolla = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!confirm("¿Estás seguro? Se eliminarán todas las apuestas y resultados asociados.")) return;
    setEliminando(id);
    const res = await fetch("/api/admin/polla/eliminar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ polla_id: id }),
    });
    const data = await res.json();
    setEliminando(null);
    if (data.ok) {
      fetchPollas();
    } else {
      alert(data.error || "Error al eliminar polla");
    }
  };

  return (
    <main className="min-h-screen p-4 text-white bg-[#0a0f1e]">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl md:text-4xl font-bold">Gestionar Pollas</h1>
        <button onClick={() => router.push("/admin/polla")}
          className="px-4 py-2 rounded-xl bg-gradient-to-b from-[#003344] to-[#0077AA] border border-cyan-300/70 text-white font-bold shadow-[0_0_18px_rgba(0,255,255,0.5)] hover:shadow-[0_0_28px_rgba(0,255,255,0.9)] active:scale-95 transition-all">
          ← Volver
        </button>
      </div>

      {cargando ? (
        <div className="text-center py-12 text-gray-400">Cargando...</div>
      ) : pollas.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400">No hay pollas creadas aún.</p>
          <button onClick={() => router.push("/admin/polla/crear")}
            className="mt-4 px-6 py-3 rounded-xl bg-emerald-600/60 border border-emerald-400/50 text-white font-bold hover:brightness-110 active:scale-95 transition-all">
            Crear Polla
          </button>
        </div>
      ) : (
        <div className="space-y-3 max-w-2xl">
          {pollas.map((p) => (
            <div key={p.id}
              onClick={() => router.push(`/admin/polla/gestionar/${p.id}`)}
              className="bg-gray-900/70 border border-gray-700 rounded-2xl p-4 cursor-pointer hover:bg-gray-800/70 hover:border-amber-500/30 transition-all active:scale-[0.99]">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-bold text-white">
                  Polla #{p.id} — {p.hipodromo}
                </h3>
                <div className="flex items-center gap-2">
                  <button onClick={(e) => eliminarPolla(e, p.id)} disabled={eliminando === p.id}
                    className="px-2 py-1 rounded-lg bg-red-500/10 border border-red-400/20 text-red-400 text-[10px] font-semibold
                      hover:bg-red-500/20 active:scale-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                    {eliminando === p.id ? "..." : "Eliminar"}
                  </button>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    p.activa
                      ? "bg-green-500/10 text-green-400 border border-green-400/20"
                      : p.cerrada_en
                      ? "bg-red-500/10 text-red-400 border border-red-400/20"
                      : "bg-gray-500/10 text-gray-400 border border-gray-400/20"
                  }`}>
                    {p.activa ? "Activa" : p.cerrada_en ? "Cerrada" : "Inactiva"}
                  </span>
                </div>
              </div>
              <div className="flex gap-4 text-xs text-gray-400">
                {p.activa && p.hora_cierre && conteos[p.id] && conteos[p.id] !== "00:00:00" ? (
                  <span className="font-mono font-bold text-amber-300/80">{conteos[p.id]}</span>
                ) : p.activa && p.hora_cierre && conteos[p.id] === "00:00:00" ? (
                  <span className="text-red-400 font-semibold">Cerrada</span>
                ) : null}
                <span>{p.total_tickets} ticket{p.total_tickets !== 1 ? "s" : ""}</span>
                <span>{p.resultados_count}/{p.carreras_count} resultados</span>
                {p.cerrada_en && (
                  <span>Bs. {Number(p.premio_1 + p.premio_2).toLocaleString()} en premios</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}