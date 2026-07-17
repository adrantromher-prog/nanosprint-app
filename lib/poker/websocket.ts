import type { CalibrationData, WsMessage } from './types';

export interface WsManager {
  send: (data: unknown) => void;
  close: () => void;
  isConnected: () => boolean;
}

interface WsCallbacks {
  onMessage: (msg: WsMessage) => void;
  onOpen: () => void;
  onClose: () => void;
  onError: (err: Event) => void;
}

const MAX_RECONNECT_ATTEMPTS = 10;
const INITIAL_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30000;
const PING_INTERVAL = 15000;

export function createWsManager(
  url: string,
  onMessage: (msg: WsMessage) => void,
  onOpen: () => void,
  onClose: () => void,
  onError: (err: Event) => void,
): WsManager {
  let ws: WebSocket | null = null;
  let reconnectAttempts = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let pingTimer: ReturnType<typeof setInterval> | null = null;
  let messageQueue: unknown[] = [];
  let closed = false;

  function clearTimers() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (pingTimer) {
      clearInterval(pingTimer);
      pingTimer = null;
    }
  }

  function scheduleReconnect() {
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS || closed) return;
    const delay = Math.min(
      INITIAL_RECONNECT_DELAY * Math.pow(2, reconnectAttempts),
      MAX_RECONNECT_DELAY,
    );
    reconnectTimer = setTimeout(() => {
      reconnectAttempts++;
      connect();
    }, delay);
  }

  function startPing() {
    pingTimer = setInterval(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, PING_INTERVAL);
  }

  function drainQueue() {
    while (messageQueue.length > 0) {
      const msg = messageQueue.shift();
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(msg));
      }
    }
  }

  function connect() {
    if (closed) return;
    try {
      ws = new WebSocket(url);
    } catch {
      scheduleReconnect();
      return;
    }

    ws.onopen = () => {
      reconnectAttempts = 0;
      startPing();
      drainQueue();
      onOpen();
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const msg: WsMessage = JSON.parse(event.data as string);
        onMessage(msg);
      } catch {
        onMessage({ type: 'error', data: { message: 'Mensaje inválido del servidor' } });
      }
    };

    ws.onerror = (event: Event) => {
      onError(event);
    };

    ws.onclose = () => {
      clearTimers();
      onClose();
      scheduleReconnect();
    };
  }

  connect();

  return {
    send(data: unknown) {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
      } else {
        messageQueue.push(data);
      }
    },
    close() {
      closed = true;
      clearTimers();
      messageQueue = [];
      if (ws) {
        ws.onclose = null;
        ws.close();
        ws = null;
      }
    },
    isConnected() {
      return ws !== null && ws.readyState === WebSocket.OPEN;
    },
  };
}

export function sendFrame(
  manager: WsManager,
  base64Data: string,
  calibration: CalibrationData | null,
  timestamp: number,
) {
  manager.send({
    type: 'frame',
    data: base64Data,
    calibration,
    timestamp,
  });
}

export function sendCalibration(manager: WsManager, calData: CalibrationData) {
  manager.send({
    type: 'calibration',
    data: calData,
  });
}

export function disconnect(manager: WsManager) {
  manager.close();
}
