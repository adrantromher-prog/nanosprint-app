"use client";

import { useEffect } from "react";

interface CarreraActiva {
  id: number;
  hora_cierre: string;
  estado: string;
}

let trompetaAgotada: Set<number> = new Set();

export default function TrompetaNotifier({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res = await fetch("/api/remates/activas");
        const data = await res.json();
        if (!data.ok) return;
        for (const c of data.carreras as CarreraActiva[]) {
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
      } catch {}
    }, 10000);
    return () => clearInterval(id);
  }, []);

  return <>{children}</>;
}
