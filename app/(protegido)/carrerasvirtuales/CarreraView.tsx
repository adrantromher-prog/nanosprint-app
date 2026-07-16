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
  const canPlayRef = useRef(false);
  const [countdown, setCountdown] = useState(3);
  const [cargando, setCargando] = useState(true);
  const [errorStr, setErrorStr] = useState("");
  const [reproducir, setReproducir] = useState(false);

  const handleEnded = useCallback(() => {
    if (finalizado.current) return;
    finalizado.current = true;
    onFinCarrera();
  }, [onFinCarrera]);

  useEffect(() => {
    finalizado.current = false;
    canPlayRef.current = false;
    duracion.current = 0;
    setCountdown(3);
    setCargando(true);
    setErrorStr("");
    setReproducir(false);
  }, [url]);

  // Countdown 3, 2, 1 — al llegar a 0, mostrar el video
  useEffect(() => {
    if (countdown === 0) { setReproducir(true); return; }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  // Cuando el video está visible y listo, reproducir
  useEffect(() => {
    if (!reproducir) return;
    const v = videoRef.current;
    if (!v) return;
    if (canPlayRef.current) {
      v.play().catch(() => {});
      return;
    }
    const onCanPlay = () => {
      canPlayRef.current = true;
      v.play().catch(() => {});
      setCargando(false);
    };
    v.addEventListener("canplay", onCanPlay);
    v.load();
    return () => v.removeEventListener("canplay", onCanPlay);
  }, [reproducir]);

  // Timeout de carga: si después de 20s el video no avanzó, mostrar skip
  useEffect(() => {
    if (!reproducir || finalizado.current) return;
    const t = setTimeout(() => {
      if (!finalizado.current && videoRef.current && videoRef.current.currentTime === 0) {
        setErrorStr("El video no pudo cargarse");
      }
    }, 20000);
    return () => clearTimeout(t);
  }, [reproducir]);

  const handleLoadedMetadata = () => {
    const v = videoRef.current;
    if (!v || !v.duration || isNaN(v.duration)) return;
    duracion.current = v.duration;
  };

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v || finalizado.current || duracion.current === 0) return;
    if (v.currentTime >= duracion.current - 0.3) {
      finalizado.current = true;
      onFinCarrera();
    }
  };

  const handleWaiting = () => {
    if (!finalizado.current) setCargando(true);
  };

  const handlePlaying = () => {
    setCargando(false);
  };

  const handleStalled = () => {
    const v = videoRef.current;
    if (!v || finalizado.current) return;
    v.load();
    setTimeout(() => v.play().catch(() => {}), 1000);
  };

  const mostrarSkip = errorStr !== "" || (!finalizado.current && !cargando && videoRef.current?.currentTime === 0 && reproducir);

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
      style={{ background: "linear-gradient(135deg, #05080f 0%, #070d1a 50%, #040a12 100%)" }}
    >
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full bg-cyan-900/10 blur-[100px]" />
      </div>

      {!reproducir && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center">
          <p className="text-white/60 text-lg mb-4 font-semibold tracking-widest uppercase">Preparados...</p>
          <span className="text-white font-extrabold animate-ping" style={{ fontSize: "12rem" }}>{countdown}</span>
        </div>
      )}

      {cargando && reproducir && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center">
          <div className="w-12 h-12 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin mb-3" />
          <p className="text-white/50 text-sm">Cargando video...</p>
        </div>
      )}

      {reproducir && (
        <video
          key={url}
          ref={videoRef}
          src={url}
          muted
          playsInline
          preload="auto"
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          onWaiting={handleWaiting}
          onPlaying={handlePlaying}
          onStalled={handleStalled}
          className="absolute inset-0 w-full h-full object-contain z-10"
        />
      )}

      {mostrarSkip && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30">
          <button
            onClick={handleEnded}
            className="px-8 py-3 rounded-xl text-white font-bold bg-gradient-to-r from-yellow-600 to-orange-600 border border-white/20 hover:brightness-110 active:scale-95 transition-all animate-pulse"
          >
            Saltar a resultados →
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
