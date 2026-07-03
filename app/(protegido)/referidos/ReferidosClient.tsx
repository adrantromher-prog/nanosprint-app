"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ReferidosClient({
  referidoSaldo: saldoInicial,
  totalComisiones,
  referidos,
}: {
  referidoSaldo: number;
  totalComisiones: number;
  referidos: { sobrenombre: string; creado_en: string }[];
}) {
  const router = useRouter();
  const [referidoSaldo, setReferidoSaldo] = useState(saldoInicial);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [liberando, setLiberando] = useState(false);

  const handleLiberar = async () => {
    setLiberando(true);
    setMessage("");
    setIsError(false);
    try {
      const res = await fetch("/api/perfil/liberar-referidos", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error);
        setIsError(true);
        return;
      }
      setMessage("Saldo liberado exitosamente");
      setIsError(false);
      setReferidoSaldo(0);
      setTimeout(() => setMessage(""), 2000);
    } catch {
      setMessage("Error al conectar con el servidor");
      setIsError(true);
    }
    setLiberando(false);
  };

  return (
    <main className="relative h-screen w-full overflow-hidden select-none bg-gray-950">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950" />

      <div className="relative z-10 h-full flex flex-col px-3 py-2 gap-1.5">
        <div className="flex items-center justify-between flex-shrink-0">
          <button onClick={() => router.push("/perfil")}
            className="px-3 py-1.5 rounded-lg bg-white/[0.06] backdrop-blur border border-white/[0.12] text-white font-semibold text-xs tracking-wide hover:bg-white/[0.12] active:scale-95 transition-all">
            ← Volver
          </button>
          <h1 className="text-white text-base font-extrabold tracking-wide">Control de Referidos</h1>
          <div className="w-16" />
        </div>

        <div className="flex-1 flex flex-col gap-2 max-w-md mx-auto w-full pt-6">
          <div className="w-full py-4 px-3 rounded-2xl bg-gradient-to-b from-yellow-900/30 to-yellow-900/10 backdrop-blur border border-yellow-400/30 shadow-[0_0_20px_rgba(255,200,0,0.1)] text-center flex-shrink-0">
            <p className="text-yellow-300/60 text-[10px] font-semibold tracking-[0.15em] uppercase mb-1">Saldo de referidos</p>
            <p className="text-yellow-100 font-black text-3xl tracking-wide drop-shadow-[0_0_10px_rgba(255,200,0,0.3)]">
              Bs. {Number(referidoSaldo).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="w-full py-2.5 px-3 rounded-xl bg-white/[0.05] backdrop-blur border border-white/[0.10] flex-shrink-0">
            <div className="flex justify-between items-center">
              <span className="text-white/50 text-xs font-medium">Total comisiones generadas</span>
              <span className="text-white text-sm font-bold">Bs. {totalComisiones.toFixed(2)}</span>
            </div>
          </div>

          {referidoSaldo >= 2500 && (
            <button onClick={handleLiberar} disabled={liberando}
              className="w-full py-3 rounded-xl bg-gradient-to-b from-green-700 to-green-900 border border-green-400/50 text-white font-bold text-sm tracking-wide shadow-[0_0_16px_rgba(0,200,0,0.2)] hover:shadow-[0_0_24px_rgba(0,200,0,0.4)] active:scale-95 transition-all disabled:opacity-50 flex-shrink-0">
              {liberando ? "Liberando..." : "Liberar saldo"}
            </button>
          )}

          {referidoSaldo < 2500 && referidoSaldo > 0 && (
            <p className="text-yellow-300/60 text-[10px] text-center font-semibold flex-shrink-0">
              Mínimo Bs. 2.500 para liberar (faltan Bs. {(2500 - referidoSaldo).toFixed(2)})
            </p>
          )}

          {message && (
            <p className={`text-center text-[10px] font-bold py-1 px-2 rounded-lg backdrop-blur-sm flex-shrink-0 ${
              isError
                ? "text-red-300 bg-red-900/40 border border-red-500/60"
                : "text-green-300 bg-green-900/40 border border-green-500/60"
            }`}>
              {message}
            </p>
          )}

          <div className="flex-1 min-h-0 flex flex-col">
            <h2 className="text-white/50 text-[10px] font-semibold tracking-[0.15em] uppercase mb-1 flex-shrink-0">
              Tus referidos ({referidos.length})
            </h2>
            <div className="flex-1 overflow-y-auto rounded-xl bg-white/[0.03] border border-white/[0.06]">
              {referidos.length === 0 ? (
                <div className="flex items-center justify-center h-20 text-white/30 text-xs">
                  No tienes referidos aún
                </div>
              ) : (
                <div className="divide-y divide-white/[0.06]">
                  {referidos.map((ref, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2">
                      <span className="text-white text-xs font-semibold">{ref.sobrenombre}</span>
                      <span className="text-white/30 text-[10px] font-mono">{ref.creado_en}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
