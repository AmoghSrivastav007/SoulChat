"use client";

import { useEffect, useState } from "react";
import { ConstellationMap } from "@/components/constellation/ConstellationMap";
import { apiClient } from "@/lib/api";
import { Chat } from "@/types";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

export default function ConstellationPage() {
  const [contacts, setContacts] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get<Chat[]>("/api/chats")
      .then(setContacts)
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  return (
    <ErrorBoundary>
      <div className="space-y-3 p-4">
        <div>
          <h1 className="text-xl font-semibold">Constellation</h1>
          <p className="text-sm text-[var(--text-secondary)]">Your relationship universe — star size reflects connection strength</p>
        </div>

        {loading ? (
          <Skeleton className="h-[480px] w-full rounded-xl" />
        ) : (
          <ConstellationMap contacts={contacts} />
        )}
      </div>
    </ErrorBoundary>
  );
}
