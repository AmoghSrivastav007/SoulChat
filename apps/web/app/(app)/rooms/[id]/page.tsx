"use client";

import { useEffect, useState } from "react";
import { SpatialRoom } from "@/components/spatial/SpatialRoom";
import { TimeCapsule } from "@/components/chat/TimeCapsule";
import { apiClient } from "@/lib/api";
import { RoomItem } from "@/types";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

export default function RoomPage({ params }: { params: { id: string } }) {
  const [room, setRoom] = useState<RoomItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get<RoomItem[]>("/api/rooms")
      .then((rooms) => setRoom(rooms.find((r) => r.id === params.id) ?? null))
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px] w-full rounded-xl" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="space-y-4 p-4">
        <h1 className="text-xl font-semibold">{room?.name ?? `Room ${params.id}`}</h1>
        <SpatialRoom roomId={params.id} roomName={room?.name ?? `Room ${params.id}`} />
        <TimeCapsule chatId={params.id} />
      </div>
    </ErrorBoundary>
  );
}
