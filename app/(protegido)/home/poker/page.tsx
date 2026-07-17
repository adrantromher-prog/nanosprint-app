'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AppMode, CalibrationData, WsMessage } from '@/lib/poker/types';
import { createWsManager, disconnect, sendCalibration, sendFrame } from '@/lib/poker/websocket';
import CameraCapture from '@/components/poker/CameraCapture';
import HUD from '@/components/poker/HUD';
import CalibrationOverlay from '@/components/poker/CalibrationOverlay';
import ConfigPanel from '@/components/poker/ConfigPanel';
import type { WsManager } from '@/lib/poker/websocket';

const DEFAULT_WS_URL = 'ws://localhost:8000/ws';
const DEFAULT_FPS = 3;

const CAL_STORAGE_KEY = 'poker_calibration_data';

export default function PokerPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AppMode>('IDLE');
  const [wsUrl, setWsUrl] = useState(DEFAULT_WS_URL);
  const [fps, setFps] = useState(DEFAULT_FPS);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WsMessage | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [calibration, setCalibration] = useState<CalibrationData | null>(null);
  const [connectionError, setConnectionError] = useState(false);
  const [showHud, setShowHud] = useState(true);

  const wsRef = useRef<WsManager | null>(null);
  const lastFrameRef = useRef<string | null>(null);
  const fpsCountRef = useRef(0);
  const [hudFps, setHudFps] = useState(0);

  useEffect(() => {
    const savedCal = localStorage.getItem(CAL_STORAGE_KEY);
    if (savedCal) {
      try {
        setCalibration(JSON.parse(savedCal));
      } catch { /* ignore */ }
    }
    const url = localStorage.getItem('poker_ws_url');
    if (url) setWsUrl(url);
    const savedFps = localStorage.getItem('poker_fps');
    if (savedFps) setFps(parseInt(savedFps, 10) || DEFAULT_FPS);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setHudFps(fpsCountRef.current);
      fpsCountRef.current = 0;
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const connectWs = useCallback((url: string) => {
    const manager = createWsManager(
      url,
      (msg: WsMessage) => {
        setLastMessage(msg);
        setConnectionError(false);

        if (msg.type === 'calibration_ack') {
          setConnectionError(false);
        }
        if (msg.type === 'error') {
          setConnectionError(true);
        }
      },
      () => {
        setIsConnected(true);
        setConnectionError(false);
      },
      () => {
        setIsConnected(false);
      },
      () => {
        setConnectionError(true);
      },
    );
    wsRef.current = manager;
  }, []);

  const handleFrame = useCallback((base64: string) => {
    lastFrameRef.current = base64;
    setCapturedImage(`data:image/jpeg;base64,${base64}`);
    fpsCountRef.current++;

    if (wsRef.current?.isConnected() && calibration) {
      sendFrame(wsRef.current, base64, calibration, Date.now());
    }
  }, [calibration]);

  const handleStart = useCallback(
    (url: string, selectedFps: number) => {
      setWsUrl(url);
      setFps(selectedFps);
      disconnectIfNeeded();
      connectWs(url);
      setMode('STREAMING');
      setCameraError(null);
    },
    [connectWs],
  );

  const handleCalibrate = useCallback(() => {
    if (mode === 'STREAMING') {
      disconnectIfNeeded();
    }
    setMode('CALIBRATING');
  }, [mode]);

  const handleCalibrationSave = useCallback(
    (data: CalibrationData) => {
      setCalibration(data);
      setMode('IDLE');
    },
    [],
  );

  const handleCalibrationCancel = useCallback(() => {
    setMode('IDLE');
  }, []);

  const handleCameraError = useCallback((error: string) => {
    setCameraError(error);
  }, []);

  const handleBack = useCallback(() => {
    disconnectIfNeeded();
    router.push('/home');
  }, [router]);

  const disconnectIfNeeded = useCallback(() => {
    if (wsRef.current) {
      disconnect(wsRef.current);
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const handleToggleHud = useCallback(() => {
    setShowHud((prev) => !prev);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      {/* Top bar */}
      <header className="sticky top-0 z-40 px-4 py-3 flex items-center justify-between border-b border-white/[0.08] bg-white/[0.04] backdrop-blur-xl">
        <button
          onClick={handleBack}
          className="px-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.12] text-white/70 text-sm hover:text-white transition-colors"
        >
          ← Volver
        </button>

        <h1 className="text-white font-bold text-base tracking-wide">
          Poker Assistant - Spin & Go
        </h1>

        {mode === 'STREAMING' && (
          <button
            onClick={handleToggleHud}
            className={`px-3 py-1.5 rounded-lg border text-xs transition-colors ${
              showHud
                ? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-400'
                : 'bg-white/[0.06] border-white/[0.12] text-white/50'
            }`}
          >
            HUD
          </button>
        )}

        {mode !== 'STREAMING' && <div className="w-[57px]" />}
      </header>

      {/* Main content */}
      <main className="px-4 py-4 max-w-[480px] mx-auto space-y-4">
        {mode === 'IDLE' && (
          <ConfigPanel onStart={handleStart} onCalibrate={handleCalibrate} />
        )}

        {mode === 'STREAMING' && (
          <>
            <CameraCapture
              onFrame={handleFrame}
              onError={handleCameraError}
              fps={fps}
              enabled={true}
            />

            {cameraError && (
              <div className="p-3 rounded-xl bg-red-900/20 border border-red-500/20">
                <p className="text-red-400 text-xs text-center">{cameraError}</p>
              </div>
            )}

            {connectionError && (
              <div className="p-3 rounded-xl bg-amber-900/20 border border-amber-500/20">
                <p className="text-amber-400 text-xs text-center">
                  Error de conexión con el backend. Reintentando...
                </p>
              </div>
            )}

            {showHud && (
              <HUD lastMessage={lastMessage} isConnected={isConnected} currentFps={hudFps} />
            )}
          </>
        )}
      </main>

      {/* Calibration overlay (full screen) */}
      {mode === 'CALIBRATING' && (
        <CalibrationOverlay
          imageSrc={capturedImage || ''}
          initialCalibration={calibration}
          onSave={handleCalibrationSave}
          onCancel={handleCalibrationCancel}
        />
      )}
    </div>
  );
}
