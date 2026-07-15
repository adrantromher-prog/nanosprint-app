"use client";

import { useEffect, useRef, useCallback, useState } from "react";

type Props = {
  url: string;
  onFinCarrera: () => void;
  apuestasConfirmadas: number[];
  cuotas: number[];
  carreraNum: number;
};

const coloresBadgeBg = [
  "bg-red-600", "bg-white", "bg-blue-600",
  "bg-yellow-400", "bg-green-600", "bg-black",
];

const coloresBadgeText = [
  "text-white", "text-black", "text-white",
  "text-black", "text-white", "text-white",
];

export default function CarreraView({ url, onFinCarrera, apuestasConfirmadas, cuotas, carreraNum }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const finalizado = useRef(false);
  const duracion = useRef(0);
  const [errorCount, setErrorCount] = useState(0);

  const handleEnded = useCallback(() => {
    if (finalizado.current) return;
    const v = videoRef.current;
    if (v && v.currentTime < duracion.current * 0.85) return;
    finalizado.current = true;
    onFinCarrera();
  }, [onFinCarrera]);

  useEffect(() => {
    finalizado.current = false;
    setErrorCount(0);
    duracion.current = 0;
    const v = videoRef.current;
    if (!v) return;
    const playVideo = async () => {
      try { await v.play(); }
      catch { setTimeout(() => v.play(), 500); }
    };
    playVideo();
  }, [url]);

  const handleLoadedMetadata = () => {
    const v = videoRef.current;
    if (!v || !v.duration || isNaN(v.duration)) return;
    duracion.current = v.duration;
  };

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v || finalizado.current || duracion.current === 0) return;
    if (v.currentTime >= duracion.current - 0.5) {
      finalizado.current = true;
      onFinCarrera();
    }
  };

  const handleError = () => {
    const v = videoRef.current;
    if (!v || errorCount >= 3) return;
    setErrorCount((c) => c + 1);
    v.load();
    setTimeout(() => v.play().catch(() => {}), 1000);
  };

  const mostrarSkip = errorCount >= 3 && !finalizado.current;

  const apuestasRealizadas = apuestasConfirmadas
    .map((monto, i) => ({
      caballo: i + 1, monto, cuota: cuotas[i],
      bgColor: coloresBadgeBg[i], textColor: coloresBadgeText[i],
    }))
    .filter((a) => a.monto > 0);

  const izquierda = apuestasRealizadas.slice(0, 3);
  const derecha = apuestasRealizadas.slice(3);

  const ApuestaCard = ({ a }: { a: typeof apuestasRealizadas[0] }) => (
    <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md border border-white/15 rounded-xl px-3 py-2.5 w-full shadow-[0_0_10px_rgba(0,0,0,0.4)]">
      <div className={`${a.bgColor} ${a.textColor} w-7 h-7 rounded-md flex items-center justify-center text-xs font-extrabold flex-shrink-0`}>
        {a.caballo}
      </div>
      <div className="flex flex-col leading-tight">
        <span className="text-white text-xs font-bold">Bs. {a.monto.toLocaleString()}</span>
        <span className="text-white/50 text-[10px]">cuota {a.cuota}</span>
      </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 overflow-hidden"
    >
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full bg-cyan-900/10 blur-[100px]" />
      </div>

      <video
        key={url}
        ref={videoRef}
        src={url}
        autoPlay
        muted
        playsInline
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onError={handleError}
        className="absolute inset-0 w-full h-full object-contain z-10"
      />

      {mostrarSkip && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30">
          <button
            onClick={handleEnded}
            className="px-8 py-3 rounded-xl text-white font-bold bg-gradient-to-r from-yellow-600 to-orange-600 border border-white/20 hover:brightness-110 active:scale-95 transition-all animate-pulse"
          >
            Saltar a resultados â†’
          </button>
        </div>
      )}

      {izquierda.length > 0 && (
        <div className="absolute left-2 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2 w-[130px]">
          {izquierda.map((a) => (
            <ApuestaCard key={a.caballo} a={a} />
          ))}
        </div>
      )}

      {derecha.length > 0 && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2 w-[130px]">
          {derecha.map((a) => (
            <ApuestaCard key={a.caballo} a={a} />
          ))}
        </div>
      )}

      <div className="absolute bottom-3 left-4 z-20">
        <p className="text-white/60 font-bold text-sm">Carrera #{String(carreraNum).padStart(4, "0")}</p>
      </div>
    </div>
  );
}