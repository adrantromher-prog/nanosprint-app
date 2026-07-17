'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CalibrationData, CalibrationRegion } from '@/lib/poker/types';

interface CalibrationOverlayProps {
  imageSrc: string;
  initialCalibration: CalibrationData | null;
  onSave: (data: CalibrationData) => void;
  onCancel: () => void;
}

interface DragState {
  regionId: string;
  startX: number;
  startY: number;
  origX: number;
  origY: number;
}

interface ResizeState {
  regionId: string;
  startDist: number;
  origWidth: number;
  origHeight: number;
  startPinchX: number;
  startPinchY: number;
}

const DEFAULT_REGIONS: CalibrationRegion[] = [
  { id: 'hero_cards', label: 'Cartas Hero', x: 35, y: 65, width: 120, height: 50, color: '#06b6d4' },
  { id: 'community_cards', label: 'Cartas Comunitarias', x: 30, y: 35, width: 200, height: 50, color: '#a855f7' },
  { id: 'pot', label: 'Bote', x: 38, y: 25, width: 140, height: 30, color: '#f59e0b' },
  { id: 'hero_stack', label: 'Stack Hero', x: 5, y: 60, width: 60, height: 30, color: '#22c55e' },
  { id: 'player1_stack', label: 'Stack Oponente 1', x: 5, y: 10, width: 60, height: 30, color: '#3b82f6' },
  { id: 'player2_stack', label: 'Stack Oponente 2', x: 75, y: 10, width: 60, height: 30, color: '#3b82f6' },
  { id: 'current_bet', label: 'Apuesta Actual', x: 30, y: 50, width: 100, height: 30, color: '#ef4444' },
  { id: 'action_indicator', label: 'Indicador Acción', x: 10, y: 30, width: 80, height: 40, color: '#f97316' },
];

const CAL_STORAGE_KEY = 'poker_calibration_data';
const ROOM_NAME = 'spin_and_go';

export default function CalibrationOverlay({
  imageSrc,
  initialCalibration,
  onSave,
  onCancel,
}: CalibrationOverlayProps) {
  const [step, setStep] = useState(0);
  const [regions, setRegions] = useState<CalibrationRegion[]>(() => {
    if (initialCalibration?.regions?.length) return initialCalibration.regions;
    const saved = localStorage.getItem(CAL_STORAGE_KEY);
    if (saved) {
      try {
        const parsed: CalibrationData = JSON.parse(saved);
        if (parsed.regions?.length) return parsed.regions;
      } catch { /* ignore */ }
    }
    return DEFAULT_REGIONS;
  });

  const [savedMsg, setSavedMsg] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const resizeRef = useRef<ResizeState | null>(null);
  const touchesRef = useRef<Map<string, { regionId: string; startX: number; startY: number; origX: number; origY: number }>>(new Map());

  const clipRegions = useCallback((r: CalibrationRegion, maxW: number, maxH: number): CalibrationRegion => ({
    ...r,
    x: Math.max(0, Math.min(r.x, maxW - r.width)),
    y: Math.max(0, Math.min(r.y, maxH - r.height)),
    width: Math.max(30, Math.min(r.width, maxW - r.x)),
    height: Math.max(20, Math.min(r.height, maxH - r.y)),
  }), []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, regionId: string) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const maxW = 100;
      const maxH = 100;
      container.setPointerCapture(e.pointerId);
      const region = regions.find((r) => r.id === regionId);
      if (!region) return;
      dragRef.current = {
        regionId,
        startX: e.clientX,
        startY: e.clientY,
        origX: region.x,
        origY: region.y,
      };
    },
    [regions],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current) return;
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const maxW = 100;
      const maxH = 100;

      const dx = ((e.clientX - dragRef.current.startX) / rect.width) * 100;
      const dy = ((e.clientY - dragRef.current.startY) / rect.height) * 100;

      setRegions((prev) =>
        prev.map((r) => {
          if (r.id !== dragRef.current!.regionId) return r;
          const updated = {
            ...r,
            x: Math.max(0, Math.min(dragRef.current!.origX + dx, maxW - r.width)),
            y: Math.max(0, Math.min(dragRef.current!.origY + dy, maxH - r.height)),
          };
          return updated;
        }),
      );
    },
    [],
  );

  const handlePointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent, regionId: string) => {
      e.preventDefault();
      setRegions((prev) =>
        prev.map((r) => {
          if (r.id !== regionId) return r;
          const delta = e.deltaY > 0 ? -2 : 2;
          return clipRegions(
            {
              ...r,
              width: r.width + delta,
              height: r.height + delta,
            },
            100,
            100,
          );
        }),
      );
    },
    [clipRegions],
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent, regionId: string) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const region = regions.find((r) => r.id === regionId);
        if (!region) return;
        touchesRef.current.set(regionId, {
          regionId,
          startX: touch.clientX,
          startY: touch.clientY,
          origX: region.x,
          origY: region.y,
        });
      } else if (e.touches.length === 2) {
        touchesRef.current.delete(regionId);
        const region = regions.find((r) => r.id === regionId);
        if (!region) return;
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY,
        );
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        resizeRef.current = {
          regionId,
          startDist: dist,
          origWidth: region.width,
          origHeight: region.height,
          startPinchX: midX,
          startPinchY: midY,
        };
      }
    },
    [regions],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const container = containerRef.current;
      if (!container) return;

      if (e.touches.length === 2 && resizeRef.current) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY,
        );
        const scale = dist / resizeRef.current.startDist;
        setRegions((prev) =>
          prev.map((r) => {
            if (r.id !== resizeRef.current!.regionId) return r;
            return clipRegions(
              {
                ...r,
                width: resizeRef.current!.origWidth * scale,
                height: resizeRef.current!.origHeight * scale,
              },
              100,
              100,
            );
          }),
        );
        return;
      }

      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const rect = container.getBoundingClientRect();
        for (const [, state] of touchesRef.current) {
          const dx = ((touch.clientX - state.startX) / rect.width) * 100;
          const dy = ((touch.clientY - state.startY) / rect.height) * 100;
          setRegions((prev) =>
            prev.map((r) => {
              if (r.id !== state.regionId) return r;
              return {
                ...r,
                x: Math.max(0, Math.min(state.origX + dx, 100 - r.width)),
                y: Math.max(0, Math.min(state.origY + dy, 100 - r.height)),
              };
            }),
          );
          break;
        }
      }
    },
    [clipRegions],
  );

  const handleTouchEnd = useCallback(() => {
    touchesRef.current.clear();
    resizeRef.current = null;
  }, []);

  const handleSave = useCallback(() => {
    const data: CalibrationData = {
      regions,
      imageWidth: 640,
      imageHeight: 480,
      room_name: ROOM_NAME,
    };
    localStorage.setItem(CAL_STORAGE_KEY, JSON.stringify(data));
    onSave(data);
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2000);
  }, [regions, onSave]);

  const totalSteps = regions.length;
  const currentRegion = regions[step];

  const stepLabels = [
    'Selecciona las regiones de la pantalla',
    ...regions.map((r) => `Ajusta: ${r.label}`),
    'Revisar y guardar',
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950/98">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-white/[0.08] bg-white/[0.04] backdrop-blur-xl">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.12] text-white/70 text-sm hover:text-white transition-colors"
        >
          Cancelar
        </button>
        <h2 className="text-white font-bold text-sm">Calibración - Paso {step + 1}/{totalSteps + 1}</h2>
        <div className="flex gap-2">
          {step > 0 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="px-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.12] text-white/70 text-sm hover:text-white transition-colors"
            >
              Anterior
            </button>
          )}
          {step < totalSteps ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              className="px-4 py-1.5 rounded-lg bg-gradient-to-b from-cyan-600 to-cyan-800 border border-cyan-400/50 text-white font-bold text-sm shadow-[0_0_18px_rgba(6,182,212,0.25)] hover:shadow-[0_0_28px_rgba(6,182,212,0.5)] active:scale-95 transition-all"
            >
              Siguiente
            </button>
          ) : (
            <button
              onClick={handleSave}
              className="px-4 py-1.5 rounded-lg bg-gradient-to-b from-emerald-600 to-emerald-800 border border-emerald-400/50 text-white font-bold text-sm shadow-[0_0_18px_rgba(16,185,129,0.25)] hover:shadow-[0_0_28px_rgba(16,185,129,0.5)] active:scale-95 transition-all"
            >
              Guardar
            </button>
          )}
        </div>
      </div>

      {/* Step indicator */}
      <div className="px-4 py-2 text-center text-xs text-white/50 border-b border-white/[0.04] bg-white/[0.02]">
        {stepLabels[step]}
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div
          ref={containerRef}
          className="relative w-full max-w-[480px] aspect-[4/3] rounded-2xl overflow-hidden border border-white/[0.12] bg-black/60"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
        >
          {imageSrc ? (
            <img src={imageSrc} alt="Captura" className="absolute inset-0 w-full h-full object-contain" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-white/30 text-sm">
              Sin captura
            </div>
          )}

          {/* All regions */}
          {regions.map((region, idx) => {
            const isCurrentStep = step === idx + 1;
            const isVisibleInOverview = step === 0 || isCurrentStep;
            const isVisibleInReview = step === totalSteps;
            const visible = step === 0 || step === idx + 1 || step === totalSteps;
            const borderOpacity = isCurrentStep ? '1' : isVisibleInOverview ? '0.5' : '0.2';
            const showLabel = isCurrentStep || step === 0;

            return (
              <div
                key={region.id}
                className={`absolute border-2 rounded-md transition-all duration-200 ${
                  isCurrentStep ? 'animate-pulse z-10' : 'z-5'
                } ${visible ? '' : 'opacity-0 pointer-events-none'}`}
                style={{
                  left: `${region.x}%`,
                  top: `${region.y}%`,
                  width: `${region.width}%`,
                  height: `${region.height}%`,
                  borderColor: region.color,
                  opacity: borderOpacity,
                  background: `${region.color}15`,
                }}
                onPointerDown={(e) => handlePointerDown(e, region.id)}
                onWheel={(e) => handleWheel(e, region.id)}
                onTouchStart={(e) => handleTouchStart(e, region.id)}
                onTouchMove={handleTouchMove}
              >
                {showLabel && (
                  <div
                    className="absolute -top-6 left-0 px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap"
                    style={{ backgroundColor: region.color, color: '#000' }}
                  >
                    {region.label}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="px-4 py-3 border-t border-white/[0.08] bg-white/[0.04]">
        <p className="text-white/40 text-xs text-center">
          {step === 0
            ? `Arrastra y redimensiona las ${regions.length} regiones`
            : step === totalSteps
              ? 'Revisa las regiones antes de guardar'
              : `Arrastra para mover • Rueda para redimensionar • Pellizca en móvil`}
        </p>
      </div>

      {/* Saved toast */}
      {savedMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl bg-emerald-600/90 border border-emerald-400/50 text-white text-sm font-bold shadow-xl z-50">
          Calibración guardada
        </div>
      )}
    </div>
  );
}
