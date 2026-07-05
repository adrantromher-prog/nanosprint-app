"use client";

import { useEffect, useRef, useCallback } from "react";

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
  | { type: "movimiento"; usuario_id: number }
  | { type: "ganador"; carrera_id: number }
  | { type: "carrera_creada" }
  | { type: "carrera_cerrada"; carrera_id: number }
  | { type: "carrera_eliminada"; carrera_id: number }
  | { type: "caballo_retirado"; caballo_id: number }
  | { type: "jackpot_actualizado"; monto: number }
  | { type: "polla_creada"; polla_id: number }
  | { type: "polla_apuesta"; polla_id: number; usuario_id: number }
  | { type: "polla_resultados"; polla_id: number }
  | { type: "polla_cerrada"; polla_id: number }
  | { type: "polla_retiros"; polla_id: number; carrera_orden?: number };

export default function useWebSocket(handler: (event: WSEvent) => void) {
  const wsRef = useRef<WebSocket | null>(null);
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout>;
    let destroyed = false;

    function connect() {
      if (destroyed) return;
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (e) => {
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

    return () => {
      destroyed = true;
      clearTimeout(reconnectTimer);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);
}
