"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import { useAuthStore } from "@/hooks/useAuthStore";
import { apiClient } from "@/lib/api";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    username: string;
    displayName: string;
  };
};

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError("Please enter a valid email and password.");
      return;
    }

    try {
      setIsSubmitting(true);
      const data = await apiClient.post<LoginResponse>("/api/auth/login", parsed.data);
      setAuth(data);
      router.push("/chat");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to login.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-6 shadow-sm">
      <h1 className="mb-1 text-2xl font-semibold">Welcome back</h1>
      <p className="mb-6 text-sm text-[var(--text-secondary)]">Sign in to SoulChat.</p>
      <form className="space-y-4" onSubmit={onSubmit}>
        <label className="block text-sm">
          Email
          <input
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label className="block text-sm">
          Password
          <input
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        {error ? <p className="text-sm text-red-500">{error}</p> : null}
        <button
          type="submit"
          className="w-full rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
      <p className="mt-4 text-sm text-[var(--text-secondary)]">
        New here?{" "}
        <Link href="/register" className="text-[var(--accent)] underline">
          Create account
        </Link>
      </p>
    </section>
  );
}
