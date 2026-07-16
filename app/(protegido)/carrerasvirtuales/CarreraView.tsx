"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  url: string;
  carreraNum: number;
};

export default function CarreraView({ url, carreraNum }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [countdown, setCountdown] = useState(3);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    setCountdown(3);
    setCargando(true);
  }, [url]);

  // Countdown 3, 2, 1
  useEffect(() => {
    if (countdown === 0) {
      const v = videoRef.current;
      if (!v) return;
      v.play().catch(() => setTimeout(() => v.play().catch(() => {}), 500));
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  return (
    <div
      className="fixed inset-0 overflow-hidden"
      style={{ background: "linear-gradient(135deg, #05080f 0%, #070d1a 50%, #040a12 100%)" }}
    >
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full bg-cyan-900/10 blur-[100px]" />
      </div>

      {countdown > 0 && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center">
          <p className="text-white/60 text-lg mb-4 font-semibold tracking-widest uppercase">Preparados...</p>
          <span className="text-white font-extrabold animate-ping" style={{ fontSize: "12rem" }}>{countdown}</span>
        </div>
      )}

      {cargando && countdown === 0 && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center">
          <div className="w-12 h-12 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin mb-3" />
          <p className="text-white/50 text-sm">Cargando video...</p>
        </div>
      )}

      <video
        key={url}
        ref={videoRef}
        src={url}
        muted
        playsInline
        preload="auto"
        poster=""
        onWaiting={() => setCargando(true)}
        onPlaying={() => setCargando(false)}
        onLoadedData={() => setCargando(false)}
        className={`absolute inset-0 w-full h-full object-contain z-10 ${countdown > 0 ? "hidden" : ""}`}
      />

      <div className="absolute bottom-3 left-4 z-20">
        <p className="text-white/60 font-bold text-sm">Carrera #{String(carreraNum).padStart(4, "0")}</p>
      </div>
    </div>
  );
}
