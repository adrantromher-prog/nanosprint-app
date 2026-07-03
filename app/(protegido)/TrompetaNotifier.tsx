"use client";

import { useEffect, useCallback } from "react";
import useWebSocket from "@/hooks/useWebSocket";

interface CarreraActiva {
  id: number;
  hora_cierre: string;
  estado: string;
}

let trompetaAgotada: Set<number> = new Set();

function verificarTrompeta(carreras: CarreraActiva[]) {
  for (const c of carreras) {
    if (c.estado === "cerrada" || trompetaAgotada.has(c.id)) continue;
    const [horas, minutos] = c.hora_cierre.split(":").map(Number);
    const cierre = new Date();
    cierre.setHours(horas, minutos, 0, 0);
    const diff = cierre.getTime() - Date.now();
    if (diff <= 300000 && diff > 0) {
      trompetaAgotada.add(c.id);
      const t = new Audio("/trompeta.mp3");
      t.volume = 0.5;
      t.play().catch(() => {});
    }
  }
}

export default function TrompetaNotifier({ children }: { children: React.ReactNode }) {
  const recargar = useCallback(async () => {
    try {
      const res = await fetch("/api/remates/activas");
      const data = await res.json();
      if (data.ok) verificarTrompeta(data.carreras);
    } catch {}
  }, []);

  useWebSocket(useCallback((event) => {
    if (["puja", "carrera_creada"].includes(event.type)) {
      recargar();
    }
  }, [recargar]));

  useEffect(() => {
    recargar();
    const id = setInterval(recargar, 30000);
    return () => clearInterval(id);
  }, [recargar]);

  return <>{children}</>;
}
