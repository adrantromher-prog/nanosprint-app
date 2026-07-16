"use client";

import { useState } from "react";

type CaballoStat = {
  numero: number;
  nombre: string;
  velocidad: number;
  resistencia: number;
  forma: string;
  ultimasLlegadas: number[];
  color: string;
  estilo: string;
};

type Props = {
  usuario: { nombre: string; saldo: number };
  cuotas: number[];
  apuestas: number[];
  apuestasConfirmadas: number[];
  tiempo: number;
  carreraNum: number;
  estadisticas: CaballoStat[];
  ultimosGanadores: number[];
  onChangeApuestas: (apuestas: number[]) => void;
  onConfirmar: () => void;
};

const coloresHex = ["#dc2626", "#e5e7eb", "#2563eb", "#facc15", "#16a34a", "#0f172a"];
const coloresText = ["#fff", "#0f172a", "#fff", "#0f172a", "#fff", "#fff"];
const coloresApostarBg = ["bg-red-600/80", "bg-white/80", "bg-blue-600/80", "bg-yellow-400/80", "bg-green-600/80", "bg-black/80"];
const coloresApostarText = ["text-white", "text-black", "text-white", "text-black", "text-white", "text-white"];

export default function ApuestasView({
  usuario,
  cuotas,
  apuestas,
  apuestasConfirmadas,
  tiempo,
  carreraNum,
  estadisticas,
  ultimosGanadores,
  onChangeApuestas,
  onConfirmar,
}: Props) {

  const [mensajeError, setMensajeError] = useState("");
  const [mostrarPopup, setMostrarPopup] = useState(false);

  const montoFijo = 500;
  const totalApostado = apuestas.reduce((a, b) => a + b, 0);

  const apuestasRealizadas = apuestas
    .map((monto, i) => ({ caballo: i + 1, monto, cuota: cuotas[i] }))
    .filter((a) => a.monto > 0);

  const apostarAlCaballo = (index: number) => {
    const nuevas = [...apuestas];
    const totalEnEsteCaballo = nuevas[index] + apuestasConfirmadas[index];
    if (totalEnEsteCaballo + montoFijo > 5000) {
      setMensajeError("MÃ¡ximo Bs. 5.000 por caballo");
      return;
    }
    nuevas[index] += montoFijo;
    onChangeApuestas(nuevas);
    setMensajeError("");
  };

  const borrarApuestas = () => {
    onChangeApuestas([0, 0, 0, 0, 0, 0]);
    setMensajeError("");
  };

  const handleConfirmar = () => {
    if (totalApostado === 0) { setMensajeError("Debes apostar a al menos un caballo."); return; }
    if (totalApostado > usuario.saldo) { setMensajeError("Saldo insuficiente."); return; }
    for (let i = 0; i < 6; i++) {
      if (apuestas[i] + apuestasConfirmadas[i] > 5000) {
        setMensajeError("MÃ¡ximo Bs. 5.000 al Caballo " + (i + 1)); return;
      }
    }
    setMensajeError("");
    setMostrarPopup(true);
  };

  const barColor = (v: number) => v >= 85 ? "#22c55e" : v >= 75 ? "#eab308" : "#ef4444";

  return (
    <div className="relative w-full h-screen overflow-hidden text-white select-none">

      {/* ORBES DE FONDO */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-20 w-[500px] h-[500px] rounded-full bg-blue-500/8 blur-[120px]" />
        <div className="absolute top-1/3 -right-32 w-[400px] h-[400px] rounded-full bg-blue-600/5 blur-[100px]" />
      </div>

      {/* GRID */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.03]"
        style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />

      {/* ===== CONTENIDO ===== */}
      <div className="relative z-10 flex flex-col h-full px-3 pt-3 md:px-5 md:pt-4">

        {/* HEADER */}
        <div className="flex justify-between items-center flex-shrink-0 mb-2">
          <div className="bg-white/5 backdrop-blur-md rounded-xl px-3 py-2 border border-white/10">
            <p className="text-sm font-bold text-white truncate max-w-[120px]">{usuario.nombre}</p>
            <p className="text-green-400 text-sm font-semibold">Bs. {usuario.saldo.toFixed(2)}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-black/40 backdrop-blur-md rounded-xl px-3 py-2 border border-white/10 flex items-center gap-2">
              <span className={`font-extrabold ${tiempo <= 5 ? "text-red-400 animate-pulse" : "text-white/90"} text-2xl md:text-3xl`}>{tiempo}</span>
              <span className="text-white/30 text-[10px] font-mono">#{String(carreraNum).padStart(4, "0")}</span>
            </div>
            <button onClick={() => window.location.href = "/home"}
              className="px-3 py-2 rounded-xl text-white text-xs font-bold bg-red-600/80 border border-white/10 hover:bg-red-700 active:scale-95 transition-all">
              Inicio
            </button>
          </div>
        </div>

        {/* ===== ESTADÍSTICAS 3×2 FIJAS ===== */}
        <div className="flex-shrink-0 grid grid-cols-3 gap-2 mb-4">
          {estadisticas.length >= 6 && [0, 1, 2].map((i) => (
            <div key={i} className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden">
              <div className="h-9 flex items-center justify-center gap-1.5 text-[11px] md:text-sm font-bold px-1"
                style={{ backgroundColor: coloresHex[i], color: coloresText[i] }}>
                <span className="opacity-80 text-sm font-bold">#{i + 1}</span>
                <span>{estadisticas[i].nombre || ("Caballo " + (i + 1))}</span>
              </div>
              <div className="p-2.5 space-y-1">
                <div className="flex justify-between text-[9px] md:text-[10px]">
                  <span className="opacity-50">Estilo</span>
                  <span className="font-medium">{estadisticas[i].estilo}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[9px] md:text-[10px] opacity-50 w-5">Vel</span>
                  <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: estadisticas[i].velocidad + "%", backgroundColor: barColor(estadisticas[i].velocidad) }} />
                  </div>
                  <span className="text-[9px] font-medium w-4 text-right">{estadisticas[i].velocidad}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[9px] md:text-[10px] opacity-50 w-5">Res</span>
                  <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: estadisticas[i].resistencia + "%", backgroundColor: barColor(estadisticas[i].resistencia) }} />
                  </div>
                  <span className="text-[9px] font-medium w-4 text-right">{estadisticas[i].resistencia}</span>
                </div>
                <div className="flex justify-between text-[9px] md:text-[10px]">
                  <span className="opacity-50">Forma</span>
                  <span className={`font-medium ${estadisticas[i].forma === "Excelente" ? "text-green-400" : estadisticas[i].forma === "Buena" ? "text-yellow-400" : "text-red-400"}`}>{estadisticas[i].forma}</span>
                </div>
                <div className="flex items-center gap-1 pt-0.5">
                  <span className="text-[8px] opacity-40">Lleg:</span>
                  {estadisticas[i].ultimasLlegadas.slice(0, 5).map((pos, j) => (
                    <div key={j} className={`w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold ${
                      pos <= 2 ? "bg-green-500/30 text-green-300" : pos <= 4 ? "bg-yellow-500/25 text-yellow-300" : "bg-red-500/20 text-red-300"
                    }`}>{pos}</div>
                  ))}
                </div>
              </div>
            </div>
          ))}
          {estadisticas.length >= 6 && [3, 4, 5].map((i) => (
            <div key={i} className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden">
              <div className="h-9 flex items-center justify-center gap-1.5 text-[11px] md:text-sm font-bold px-1"
                style={{ backgroundColor: coloresHex[i], color: coloresText[i] }}>
                <span className="opacity-80 text-sm font-bold">#{i + 1}</span>
                <span>{estadisticas[i].nombre || ("Caballo " + (i + 1))}</span>
              </div>
              <div className="p-2.5 space-y-1">
                <div className="flex justify-between text-[9px] md:text-[10px]">
                  <span className="opacity-50">Estilo</span>
                  <span className="font-medium">{estadisticas[i].estilo}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[9px] md:text-[10px] opacity-50 w-5">Vel</span>
                  <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: estadisticas[i].velocidad + "%", backgroundColor: barColor(estadisticas[i].velocidad) }} />
                  </div>
                  <span className="text-[9px] font-medium w-4 text-right">{estadisticas[i].velocidad}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[9px] md:text-[10px] opacity-50 w-5">Res</span>
                  <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: estadisticas[i].resistencia + "%", backgroundColor: barColor(estadisticas[i].resistencia) }} />
                  </div>
                  <span className="text-[9px] font-medium w-4 text-right">{estadisticas[i].resistencia}</span>
                </div>
                <div className="flex justify-between text-[9px] md:text-[10px]">
                  <span className="opacity-50">Forma</span>
                  <span className={`font-medium ${estadisticas[i].forma === "Excelente" ? "text-green-400" : estadisticas[i].forma === "Buena" ? "text-yellow-400" : "text-red-400"}`}>{estadisticas[i].forma}</span>
                </div>
                <div className="flex items-center gap-1 pt-0.5">
                  <span className="text-[8px] opacity-40">Lleg:</span>
                  {estadisticas[i].ultimasLlegadas.slice(0, 5).map((pos, j) => (
                    <div key={j} className={`w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold ${
                      pos <= 2 ? "bg-green-500/30 text-green-300" : pos <= 4 ? "bg-yellow-500/25 text-yellow-300" : "bg-red-500/20 text-red-300"
                    }`}>{pos}</div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ÚLTIMOS GANADORES */}
        {ultimosGanadores.length > 0 && (
          <div className="flex items-center gap-2 flex-shrink-0 mb-4">
            <span className="text-white/40 text-[10px] font-bold uppercase tracking-widest mr-1">{"\u00daltimos Ganadores"}</span>
            {[...ultimosGanadores].reverse().slice(0, 10).map((num, i) => (
              <div key={i} className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold border border-white/10"
                style={{ backgroundColor: coloresHex[num - 1], color: coloresText[num - 1] }}>{num}</div>
            ))}
          </div>
        )}

        {/* ===== APUESTAS 3×2 ===== */}
        <div className="flex-shrink-0 grid grid-cols-3 gap-2 mb-2">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} onClick={() => apostarAlCaballo(i)}
              className={`${coloresApostarBg[i]} ${coloresApostarText[i]} rounded-xl border border-white/10 cursor-pointer hover:brightness-110 active:scale-[0.97] transition-all text-center py-2 relative shadow-[0_2px_8px_rgba(0,0,0,0.3)]`}>
              <div className="text-[11px] md:text-xs font-bold opacity-70">Caballo {i + 1}</div>
              <div className="text-base md:text-lg font-extrabold opacity-90">x{cuotas[i]}</div>
              {apuestasConfirmadas[i] > 0 && (
                <div className="inline-block mt-1 px-2 py-0.5 rounded-md bg-black/50 border border-green-400/60 text-green-300 font-bold text-[10px]">
                  Bs. {apuestasConfirmadas[i]}
                </div>
              )}
              {apuestasConfirmadas[i] === 0 && apuestas[i] > 0 && (
                <div className="inline-block mt-1 px-2 py-0.5 rounded-md bg-black/50 border border-white/30 text-white font-bold text-[10px]">
                  + Bs. {apuestas[i]}
                </div>
              )}
              {apuestasConfirmadas[i] === 0 && apuestas[i] === 0 && (
                <div className="text-[10px] md:text-xs opacity-40 mt-1">Toca para apostar</div>
              )}
            </div>
          ))}
        </div>

        {/* ===== ERROR ===== */}
        {mensajeError && (
          <p className="text-red-400 text-[10px] md:text-xs text-center flex-shrink-0 mb-1">{mensajeError}</p>
        )}

        {/* ===== BOTONES ===== */}
        <div className="flex items-center justify-center gap-3 flex-shrink-0 pt-3 pb-0.5">
          <button onClick={borrarApuestas}
            className="px-4 py-2 rounded-xl text-white text-xs font-bold bg-red-600/80 border border-white/10 hover:bg-red-700 active:scale-95 transition-all">
            Borrar
          </button>
          <button onClick={handleConfirmar}
            className="px-5 py-2 rounded-xl text-white text-sm font-bold bg-green-600/90 border border-white/10 hover:bg-green-700 active:scale-95 transition-all">
            Confirmar {totalApostado > 0 && <span className="font-normal">Bs.{totalApostado}</span>}
          </button>
        </div>

        {/* MÍN / MÁX */}
        <div className="flex items-center justify-center flex-shrink-0 pt-0.5 pb-1">
          <span className="text-white/40 text-[10px] md:text-xs">{"M\u00ednimo"} Bs.500 &middot; {"M\u00e1ximo"} Bs.5.000</span>
        </div>

        {/* ID CARRERA */}
        <div className="absolute bottom-2 left-3 z-20">
          <p className="text-white/30 text-[10px] font-mono">Carrera #{String(carreraNum).padStart(4, "0")}</p>
        </div>
      </div>

      {/* ===== POPUP CONFIRMACIÃ“N ===== */}
      {mostrarPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0a1628] border border-white/10 rounded-2xl shadow-2xl shadow-black/40 p-6 w-[300px] flex flex-col gap-4 mx-4">
            <p className="text-white text-lg font-bold text-center">Confirmar apuesta</p>
            <div className="flex flex-col gap-1.5">
              {apuestasRealizadas.map((a) => (
                <div key={a.caballo} className="flex justify-between items-center text-xs">
                  <span className="text-white/80 font-semibold">Caballo {a.caballo}</span>
                  <span className="text-white">Bs. {a.monto}</span>
                  <span className="text-green-300">x{a.cuota}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-white/10 pt-2 flex justify-between text-xs">
              <span className="text-white/70">Total apostado</span>
              <span className="text-white font-bold">Bs. {totalApostado}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setMostrarPopup(false)}
                className="flex-1 py-2.5 rounded-xl text-white font-bold text-sm bg-red-600/80 border border-white/10 active:scale-95 transition-all">
                Cancelar
              </button>
              <button onClick={() => { setMostrarPopup(false); onConfirmar(); }}
                className="flex-1 py-2.5 rounded-xl text-white font-bold text-sm bg-green-600/80 border border-white/10 active:scale-95 transition-all">
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
