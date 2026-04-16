"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRelationshipScore } from "@/hooks/useRelationshipScore";
import { useAuthStore } from "@/hooks/useAuthStore";
import { Chat } from "@/types";

type ConstellationMapProps = {
  contacts: Chat[];
};

type StarNode = {
  id: string;
  label: string;
  x: number;
  y: number;
  size: number;
  brightness: number;
  chatId?: string;
};

// Deterministic position from id hash
function hashPosition(id: string, index: number, total: number): { x: number; y: number } {
  const angle = (index / total) * 2 * Math.PI + (id.charCodeAt(0) / 255) * Math.PI;
  const radius = 30 + ((id.charCodeAt(1) ?? 50) / 255) * 35;
  return {
    x: 50 + radius * Math.cos(angle),
    y: 50 + radius * Math.sin(angle)
  };
}

export function ConstellationMap({ contacts }: ConstellationMapProps) {
  const { scores } = useRelationshipScore();
  const user = useAuthStore((state) => state.user);
  const [hovered, setHovered] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const stars: StarNode[] = contacts.slice(0, 24).map((contact, i) => {
    const pos = hashPosition(contact.id, i, Math.max(contacts.length, 1));
    // Find relationship score for this chat's other member
    const score = scores.find((s) =>
      (s.userAId === user?.id || s.userBId === user?.id)
    );
    const strength = score ? score.score / 100 : 0.3 + (i % 5) * 0.1;
    return {
      id: contact.id,
      label: contact.name ?? contact.type,
      x: pos.x,
      y: pos.y,
      size: 4 + strength * 10,
      brightness: 0.3 + strength * 0.7,
      chatId: contact.id
    };
  });

  // Draw connecting lines on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    // Draw lines between nearby stars
    for (let i = 0; i < stars.length; i++) {
      for (let j = i + 1; j < stars.length; j++) {
        const a = stars[i];
        const b = stars[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 25) {
          const alpha = (1 - dist / 25) * 0.3;
          ctx.beginPath();
          ctx.strokeStyle = `rgba(167, 139, 250, ${alpha})`;
          ctx.lineWidth = 0.5;
          ctx.moveTo((a.x / 100) * width, (a.y / 100) * height);
          ctx.lineTo((b.x / 100) * width, (b.y / 100) * height);
          ctx.stroke();
        }
      }
    }
  }, [stars]);

  return (
    <div className="relative h-[480px] overflow-hidden rounded-xl border border-[var(--border)] bg-[#050318]">
      {/* Star field background */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(80)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: Math.random() < 0.8 ? 1 : 2,
              height: Math.random() < 0.8 ? 1 : 2,
              left: `${(i * 13.7) % 100}%`,
              top: `${(i * 7.3) % 100}%`,
              opacity: 0.1 + (i % 5) * 0.08
            }}
          />
        ))}
      </div>

      {/* Connection lines canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        width={800}
        height={480}
      />

      {/* Center — you */}
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2"
        style={{ left: "50%", top: "50%" }}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-500 shadow-[0_0_20px_rgba(139,92,246,0.8)] ring-2 ring-violet-300 text-white text-sm font-bold">
          You
        </div>
      </div>

      {/* Contact stars */}
      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:scale-125"
          style={{ left: `${star.x}%`, top: `${star.y}%` }}
          onMouseEnter={() => setHovered(star.id)}
          onMouseLeave={() => setHovered(null)}
        >
          <Link href={`/chat/${star.chatId}`}>
            <div
              className="rounded-full bg-violet-300 transition-all"
              style={{
                width: star.size,
                height: star.size,
                opacity: star.brightness,
                boxShadow: `0 0 ${star.size * 2}px rgba(196,181,253,${star.brightness * 0.8})`
              }}
            />
          </Link>

          {hovered === star.id && (
            <div className="absolute left-1/2 top-full z-10 mt-1 -translate-x-1/2 whitespace-nowrap rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-2 py-1 text-xs shadow-lg">
              {star.label}
            </div>
          )}
        </div>
      ))}

      {contacts.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-sm text-white/40">Start chatting to build your constellation</p>
        </div>
      )}
    </div>
  );
}
