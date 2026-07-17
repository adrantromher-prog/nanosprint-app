'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface CameraCaptureProps {
  onFrame: (base64: string) => void;
  onError: (error: string) => void;
  fps: number;
  enabled: boolean;
}

export default function CameraCapture({ onFrame, onError, fps, enabled }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const frameCountRef = useRef(0);
  const [showDebug, setShowDebug] = useState(false);
  const [currentFps, setCurrentFps] = useState(0);

  const stopCamera = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCapture = useCallback(() => {
    if (!canvasRef.current || !videoRef.current) return;

    const intervalMs = 1000 / fps;
    intervalRef.current = setInterval(() => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas || !video) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
      onFrame(base64);
      frameCountRef.current++;
    }, intervalMs);
  }, [fps, onFrame]);

  useEffect(() => {
    let mounted = true;
    let fpsInterval: ReturnType<typeof setInterval> | null = null;

    async function initCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: fps },
          },
        });

        if (!mounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        if (enabled) {
          startCapture();
        }

        fpsInterval = setInterval(() => {
          setCurrentFps(frameCountRef.current);
          frameCountRef.current = 0;
        }, 1000);
      } catch (err: unknown) {
        if (mounted) {
          const message =
            err instanceof DOMException
              ? err.name === 'NotAllowedError'
                ? 'Permiso de cámara denegado'
                : err.name === 'NotFoundError'
                  ? 'No se encontró cámara'
                  : 'Error al acceder a la cámara'
              : 'Error al acceder a la cámara';
          onError(message);
        }
      }
    }

    if (enabled) {
      initCamera();
    }

    return () => {
      mounted = false;
      stopCamera();
      if (fpsInterval) clearInterval(fpsInterval);
    };
  }, [enabled, fps, onError, onFrame, startCapture, stopCamera]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        stopCamera();
      } else if (enabled && !streamRef.current) {
        const init = async () => {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({
              video: {
                facingMode: 'environment',
                width: { ideal: 640 },
                height: { ideal: 480 },
                frameRate: { ideal: fps },
              },
            });
            streamRef.current = stream;
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
              await videoRef.current.play();
            }
            startCapture();
          } catch {
            onError('Error al reanudar la cámara');
          }
        };
        init();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [enabled, fps, onError, startCapture, stopCamera]);

  if (!enabled) {
    return (
      <div className="relative w-full aspect-[4/3] bg-black/40 rounded-2xl border border-white/[0.08] flex items-center justify-center overflow-hidden">
        <p className="text-white/50 text-sm">Cámara desactivada</p>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-[4/3] bg-black/60 rounded-2xl border border-white/[0.08] overflow-hidden group">
      <video
        ref={videoRef}
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
      />
      <canvas ref={canvasRef} className="hidden" />

      <button
        onClick={() => setShowDebug(!showDebug)}
        className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-black/50 text-white/60 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
      >
        Debug
      </button>

      {showDebug && (
        <div className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-black/70 text-cyan-400 text-xs font-mono">
          FPS: {currentFps}
        </div>
      )}
    </div>
  );
}
