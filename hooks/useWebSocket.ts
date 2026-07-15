"use client";

import { useEffect, useRef } from "react";

interface CarreraData {
  id: number;
  hipodromo: string;
  numero_carrera: number;
  hora_cierre: string;
  tipo: string;
  estado: string;
  ganador: number | null;
  imagen: string | null;
  caballos: { id: number; numero: number; nombre: string; retirado: boolean; puja_actual: number; pujador_sobrenombre?: string }[];
}

type WSEvent =
  | { type: "puja"; carrera?: CarreraData; usuario_id?: number; saldo?: number }
  | { type: "movimiento"; usuario_id: number; monto?: number }
  | { type: "ganador"; carrera_id: number }
  | { type: "carrera_creada" }
  | { type: "carrera_cerrada"; carrera_id: number }
  | { type: "carrera_eliminada"; carrera_id: number }
  | { type: "caballo_retirado"; caballo_id: number }
  | { type: "jackpot_actualizado"; monto: number }
  | { type: "polla_creada"; polla_id: number }
  | { type: "polla_apuesta"; polla_id: number; usuario_id: number; saldo?: number; total_tickets?: number }
  | { type: "polla_resultados"; polla_id: number }
  | { type: "polla_cerrada"; polla_id: number }
  | { type: "polla_retiros"; polla_id: number; carrera_orden?: number }
  | { type: "sync_estado"; carreras?: CarreraData[]; jackpot?: number; polla_activa?: boolean; ts: number }
  | { type: "balance_updated"; saldo: number }
  | { type: "balance_reset" };

export default function useWebSocket(handler: (event: WSEvent) => void, onFallback?: () => void) {
  const wsRef = useRef<WebSocket | null>(null);
  const handlerRef = useRef(handler);
  const fallbackRef = useRef(onFallback);
  handlerRef.current = handler;
  fallbackRef.current = onFallback;
  const lastMsgRef = useRef(Date.now());

  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout>;
    let fallbackTimer: ReturnType<typeof setInterval>;
    let destroyed = false;

    function connect() {
      if (destroyed) return;
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      // Read token from cookie and pass as query param for mobile compatibility
      const match = document.cookie.match(/(?:^|;\s*)token=([^;]+)/);
      const token = match ? encodeURIComponent(match[1]) : "";
      const wsUrl = `${protocol}//${window.location.host}/ws?token=${token}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (e) => {
        lastMsgRef.current = Date.now();
        try {
          const event = JSON.parse(e.data) as WSEvent;
          handlerRef.current(event);
        } catch {}
      };

      ws.onclose = () => {
        wsRef.current = null;
        if (!destroyed) {
          reconnectTimer = setTimeout(connect, 3000);
        }
      };

      ws.onerror = () => ws.close();
    }

    connect();

    fallbackTimer = setInterval(() => {
      if (destroyed) return;
      const elapsed = Date.now() - lastMsgRef.current;
      if (elapsed > 60000 && fallbackRef.current) {
        lastMsgRef.current = Date.now();
        fallbackRef.current();
      }
    }, 10000);

    return () => {
      destroyed = true;
      clearTimeout(reconnectTimer);
      clearInterval(fallbackTimer);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);
}
