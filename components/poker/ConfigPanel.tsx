'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CalibrationData } from '@/lib/poker/types';

interface ConfigPanelProps {
  onStart: (url: string, fps: number) => void;
  onCalibrate: () => void;
}

const STORAGE_KEY_URL = 'poker_ws_url';
const STORAGE_KEY_FPS = 'poker_fps';
const CAL_STORAGE_KEY = 'poker_calibration_data';

export default function ConfigPanel({ onStart, onCalibrate }: ConfigPanelProps) {
  const [url, setUrl] = useState('ws://localhost:8000/ws');
  const [fps, setFps] = useState(3);
  const [hasCalibration, setHasCalibration] = useState(false);
  const [urlError, setUrlError] = useState('');

  useEffect(() => {
    const savedUrl = localStorage.getItem(STORAGE_KEY_URL);
    if (savedUrl) setUrl(savedUrl);
    const savedFps = localStorage.getItem(STORAGE_KEY_FPS);
    if (savedFps) setFps(parseInt(savedFps, 10) || 3);
    checkCalibration();
  }, []);

  const checkCalibration = useCallback(() => {
    const saved = localStorage.getItem(CAL_STORAGE_KEY);
    if (saved) {
      try {
        const parsed: CalibrationData = JSON.parse(saved);
        if (parsed.regions?.length > 0) {
          setHasCalibration(true);
          return;
        }
      } catch { /* ignore */ }
    }
    setHasCalibration(false);
  }, []);

  const handleUrlChange = (value: string) => {
    setUrl(value);
    if (!value) {
      setUrlError('');
      return;
    }
    const wsPattern = /^wss?:\/\/.+/;
    const httpPattern = /^https?:\/\/.+/;
    if (wsPattern.test(value) || httpPattern.test(value)) {
      setUrlError('');
    } else {
      setUrlError('URL inválida');
    }
  };

  const handleStart = () => {
    if (!url || urlError) return;
    localStorage.setItem(STORAGE_KEY_URL, url);
    localStorage.setItem(STORAGE_KEY_FPS, String(fps));
    onStart(url, fps);
  };

  const handleResetCalibration = () => {
    localStorage.removeItem(CAL_STORAGE_KEY);
    setHasCalibration(false);
  };

  const handleOpenCalibrate = () => {
    checkCalibration();
    onCalibrate();
  };

  return (
    <div className="w-full max-w-[480px] mx-auto space-y-4">
      <div className="rounded-2xl border border-white/[0.12] bg-white/[0.06] backdrop-blur-xl p-5 space-y-4">
        <h3 className="text-white font-bold text-base">Configuración</h3>

        {/* Server URL */}
        <div>
          <label className="block text-white/60 text-xs mb-1.5">Servidor WebSocket</label>
          <input
            type="text"
            value={url}
            onChange={(e) => handleUrlChange(e.target.value)}
            placeholder="ws://localhost:8000/ws"
            className={`w-full px-3 py-2 rounded-lg bg-black/40 border ${urlError ? 'border-red-400/50' : 'border-white/[0.12]'} text-white text-sm placeholder-white/30 focus:outline-none focus:border-cyan-400/50 transition-colors`}
          />
          {urlError && <p className="text-red-400 text-xs mt-1">{urlError}</p>}
        </div>

        {/* FPS Slider */}
        <div>
          <label className="block text-white/60 text-xs mb-1.5">
            FPS: <span className="text-white font-mono">{fps}</span>
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={fps}
            onChange={(e) => setFps(parseInt(e.target.value, 10))}
            className="w-full h-2 rounded-lg appearance-none bg-white/[0.08] cursor-pointer accent-cyan-400"
          />
          <div className="flex justify-between text-white/30 text-xs mt-1">
            <span>1</span>
            <span>5</span>
            <span>10</span>
          </div>
        </div>

        {/* Calibration status */}
        <div className="flex items-center gap-3">
          <span
            className={`inline-block w-2.5 h-2.5 rounded-full ${hasCalibration ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]'}`}
          />
          <span className="text-white/50 text-xs">
            {hasCalibration ? 'Calibración configurada' : 'Calibración pendiente'}
          </span>
        </div>

        {/* Calibration buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleOpenCalibrate}
            className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-b from-purple-600 to-purple-800 border border-purple-400/50 text-white font-bold text-xs tracking-wide shadow-[0_0_18px_rgba(147,51,234,0.25)] hover:shadow-[0_0_28px_rgba(147,51,234,0.5)] active:scale-95 transition-all"
          >
            {hasCalibration ? 'Recalibrar' : 'Calibrar'}
          </button>
          {hasCalibration && (
            <button
              onClick={handleResetCalibration}
              className="px-4 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.12] text-white/50 text-xs hover:text-white/80 transition-colors"
            >
              Reset
            </button>
          )}
        </div>

        {/* Start button */}
        <button
          onClick={handleStart}
          disabled={!hasCalibration || !!urlError}
          className={`w-full px-4 py-3 rounded-xl font-bold text-sm tracking-wide transition-all ${
            hasCalibration && !urlError
              ? 'bg-gradient-to-b from-cyan-600 to-cyan-800 border border-cyan-400/50 text-white shadow-[0_0_18px_rgba(6,182,212,0.25)] hover:shadow-[0_0_28px_rgba(6,182,212,0.5)] active:scale-95'
              : 'bg-white/[0.04] border border-white/[0.08] text-white/30 cursor-not-allowed'
          }`}
        >
          Iniciar Asistente
        </button>
        {!hasCalibration && (
          <p className="text-amber-400/70 text-xs text-center">
            Debes calibrar las regiones antes de iniciar
          </p>
        )}
      </div>
    </div>
  );
}
