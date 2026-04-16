"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import { RelationshipScore } from "@/types";

export function useRelationshipScore() {
  const [scores, setScores] = useState<RelationshipScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get<RelationshipScore[]>("/api/users/me/relationship-scores")
      .then(setScores)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  return { scores, loading, error };
}
