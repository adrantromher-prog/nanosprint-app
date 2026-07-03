"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { usePathname } from "next/navigation";

const VAPID_PUBLIC = "BHykAxsMbM9V2NuKn4QpsqhGIAjnPcVOG-kdfTa6CKBpuKXHRd3gkfsr1Twl_gM8znJ61uZHJ9K7kO0evtMYVAI";

async function registrarPush() {
  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    const sub = await reg.pushManager.getSubscription();
    if (sub) return;
    const nuevaSub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: VAPID_PUBLIC,
    });
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nuevaSub.toJSON()),
    });
  } catch {}
}

async function enviarPush(titulo: string, cuerpo: string, url: string) {
  try {
    await fetch("/api/push/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titulo, cuerpo, url }),
    });
  } catch {}
}

interface EstadoMusica {
  track_idx: number;
  inicio: string;
  reproduciendo: boolean;
}

interface CarreraActiva {
  id: number;
  hora_cierre: string;
  estado: string;
}

let globalAudio: HTMLAudioElement | null = null;
let trompetaAgotada: Set<number> = new Set();

function getAudio(): HTMLAudioElement {
  if (!globalAudio) {
    globalAudio = new Audio();
    globalAudio.loop = false;
    globalAudio.volume = 0.08;
    globalAudio.preload = "auto";
  }
  return globalAudio;
}

export default function BackgroundMusic({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const activo = pathname === "/remates";
  const [estado, setEstado] = useState<EstadoMusica | null>(null);
  const [muted, setMuted] = useState(false);
  const playIdRef = useRef(0);
  const trackIdxRef = useRef(0);

  const fetchEstado = useCallback(async () => {
    try {
      const res = await fetch("/api/musica/estado");
      if (res.ok) setEstado(await res.json());
    } catch {}
  }, []);

  useEffect(() => { fetchEstado(); }, [fetchEstado]);

  useEffect(() => {
    if (!activo) return;
    const id = setInterval(fetchEstado, 5000);
    return () => clearInterval(id);
  }, [activo, fetchEstado]);

  const avanzar = useCallback(async (miTrack: number) => {
    try {
      const res = await fetch("/api/musica/estado");
      if (!res.ok) return;
      const actual: EstadoMusica = await res.json();
      if (actual.track_idx !== miTrack) {
        setEstado(actual);
        return;
      }
      const res2 = await fetch("/api/musica/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "siguiente" }),
      });
      if (res2.ok) setEstado(await res2.json());
    } catch {}
  }, []);

  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      if (Notification.permission === "default") Notification.requestPermission();
      if (Notification.permission === "granted") registrarPush();
    }
  }, []);

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
            if (Notification.permission === "granted") {
              enviarPush("Faltan 5 minutos", `Carrera #${c.id} está por cerrar`, `/remates/carrera/${c.id}`);
            }
          }
        }
      } catch {}
    }, 10000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const audio = getAudio();
    const id = ++playIdRef.current;

    audio.onended = () => {
      if (playIdRef.current === id) avanzar(trackIdxRef.current);
    };

    return () => {
      if (playIdRef.current === id) {
        audio.onended = null;
        audio.pause();
      }
    };
  }, [avanzar]);

  useEffect(() => {
    const audio = getAudio();
    if (!estado) return;

    if (!activo) {
      audio.pause();
      return;
    }

    trackIdxRef.current = estado.track_idx;
    const src = `/musica/${estado.track_idx}.mp3`;
    const fullSrc = window.location.origin + src;

    if (audio.src !== fullSrc) {
      audio.pause();
      audio.src = src;

      const onMeta = () => {
        if (!estado.inicio) return;
        const elapsed = (Date.now() - new Date(estado.inicio).getTime()) / 1000;
        if (elapsed > 0 && elapsed < audio.duration) {
          audio.currentTime = elapsed;
        }
      };
      audio.addEventListener("loadedmetadata", onMeta, { once: true });

      audio.load();

      if (estado.reproduciendo) {
        audio.play().catch(() => {});
      }
    } else {
      if (estado.reproduciendo) {
        audio.play().catch(() => {});
      } else {
        audio.pause();
      }
    }
  }, [estado, activo]);

  useEffect(() => {
    const audio = getAudio();
    audio.muted = muted;
  }, [muted]);

  return (
    <>
      {activo && estado && (
        <button onClick={() => setMuted(v => !v)}
          className="fixed top-2 right-2 z-50 w-8 h-8 rounded-full bg-black/40 backdrop-blur-md border border-white/[0.1] flex items-center justify-center hover:bg-white/10 transition-all active:scale-90"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-white/70">
            {muted
              ? <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0021 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 003.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
              : <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
            }
          </svg>
        </button>
      )}
      {children}
    </>
  );
}
