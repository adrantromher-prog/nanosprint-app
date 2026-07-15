"use client";

import { useEffect, useRef, useCallback } from "react";

type SSEChannels = "global:carrera" | "global:jackpot-virtual" | "global:jackpot-remates" | "user:me";

interface UseSSEOptions {
  channels: SSEChannels[];
  onMessage?: (channel: string, data: unknown) => void;
  onError?: (err: Event) => void;
  enabled?: boolean;
}

export function useSSE({ channels, onMessage, onError, enabled = true }: UseSSEOptions) {
  const onMessageRef = useRef(onMessage);
  const onErrorRef = useRef(onError);
  onMessageRef.current = onMessage;
  onErrorRef.current = onError;

  const connect = useCallback(() => {
    if (!enabled || channels.length === 0) return null as unknown as EventSource;

    const params = new URLSearchParams({ channels: channels.join(",") });
    const es = new EventSource(`/api/sse?${params}`);

    es.addEventListener("connected", () => {
    });

    for (const ch of channels) {
      es.addEventListener(ch, (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          onMessageRef.current?.(ch, data);
        } catch {}
      });
    }

    es.onerror = (err) => {
      onErrorRef.current?.(err);
    };

    return es;
  }, [channels.join(","), enabled]);

  useEffect(() => {
    if (!enabled || channels.length === 0) return;

    let es = connect();
    let reconnectTimer: ReturnType<typeof setTimeout>;

    const cleanup = () => {
      es?.close();
      clearTimeout(reconnectTimer);
    };

    es.onerror = () => {
      es?.close();
      reconnectTimer = setTimeout(() => {
        es = connect();
        es.onerror = () => {
          es?.close();
          reconnectTimer = setTimeout(() => {
            es = connect();
          }, 3000);
        };
      }, 3000);
    };

    return cleanup;
  }, [channels.join(","), enabled, connect]);
}
