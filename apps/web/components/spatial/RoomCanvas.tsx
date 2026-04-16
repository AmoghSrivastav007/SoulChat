"use client";

type RoomCanvasProps = {
  background: "office" | "park" | "rooftop" | "cafe";
};

const backgroundClass: Record<RoomCanvasProps["background"], string> = {
  office: "bg-slate-200",
  park: "bg-green-200",
  rooftop: "bg-indigo-200",
  cafe: "bg-amber-200"
};

export function RoomCanvas({ background }: RoomCanvasProps) {
  return <div className={`h-56 w-full rounded-xl border border-[var(--border)] ${backgroundClass[background]}`} />;
}
