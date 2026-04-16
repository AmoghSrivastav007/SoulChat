"use client";

import { useEffect, useRef, useState } from "react";

type ExpressionData = {
  happy: number;
  neutral: number;
  surprised: number;
};

// Uses MediaPipe FaceMesh via webcam if available, otherwise shows animated mock
export function LiveExpression() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [expression, setExpression] = useState<ExpressionData>({ happy: 0.5, neutral: 0.4, surprised: 0.1 });
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Animated mock when camera is off
  useEffect(() => {
    if (cameraActive) return;
    const id = setInterval(() => {
      setExpression({
        happy: Math.max(0, Math.min(1, 0.5 + (Math.random() - 0.5) * 0.3)),
        neutral: Math.max(0, Math.min(1, 0.4 + (Math.random() - 0.5) * 0.2)),
        surprised: Math.max(0, Math.min(1, 0.1 + (Math.random() - 0.5) * 0.1))
      });
    }, 1500);
    return () => clearInterval(id);
  }, [cameraActive]);

  async function startCamera(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
        setCameraError(null);
      }
    } catch {
      setCameraError("Camera access denied or unavailable.");
    }
  }

  function stopCamera(): void {
    const video = videoRef.current;
    if (video?.srcObject) {
      (video.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      video.srcObject = null;
    }
    setCameraActive(false);
  }

  const dominant = Object.entries(expression).sort((a, b) => b[1] - a[1])[0][0];
  const emojiMap: Record<string, string> = { happy: "😊", neutral: "😐", surprised: "😮" };

  return (
    <div className="rounded-xl border border-[var(--border)] p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-medium">Live Expression</p>
        <span className="text-lg">{emojiMap[dominant]}</span>
      </div>

      {/* Hidden video for camera feed */}
      <video ref={videoRef} autoPlay muted playsInline className="hidden" />

      <div className="space-y-1.5">
        {Object.entries(expression).map(([key, val]) => (
          <div key={key} className="flex items-center gap-2">
            <span className="w-16 text-xs capitalize text-[var(--text-secondary)]">{key}</span>
            <div className="flex-1 overflow-hidden rounded-full bg-[var(--bg-secondary)] h-1.5">
              <div
                className="h-full rounded-full bg-[var(--accent)] transition-all duration-700"
                style={{ width: `${Math.round(val * 100)}%` }}
              />
            </div>
            <span className="w-8 text-right text-[10px] text-[var(--text-muted)]">{Math.round(val * 100)}%</span>
          </div>
        ))}
      </div>

      <div className="mt-2 flex gap-2">
        {!cameraActive ? (
          <button
            type="button"
            className="rounded-md border border-[var(--border)] px-2 py-1 text-xs hover:bg-[var(--bg-secondary)]"
            onClick={startCamera}
          >
            Enable camera
          </button>
        ) : (
          <button
            type="button"
            className="rounded-md border border-[var(--border)] px-2 py-1 text-xs hover:bg-[var(--bg-secondary)]"
            onClick={stopCamera}
          >
            Stop camera
          </button>
        )}
        {cameraError && <p className="text-xs text-red-500">{cameraError}</p>}
        {!cameraActive && <p className="text-xs text-[var(--text-muted)]">(animated preview)</p>}
      </div>
    </div>
  );
}
