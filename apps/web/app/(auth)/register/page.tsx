"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import { apiClient } from "@/lib/api";
import { useAuthStore } from "@/hooks/useAuthStore";

const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(32),
  displayName: z.string().min(1).max(80),
  password: z.string().min(8).max(100)
});

type RegisterResponse = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    username: string;
    displayName: string;
  };
};

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [form, setForm] = useState({
    email: "",
    username: "",
    displayName: "",
    password: ""
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    const parsed = registerSchema.safeParse(form);
    if (!parsed.success) {
      setError("Please complete all fields with valid values.");
      return;
    }

    try {
      setIsSubmitting(true);
      const data = await apiClient.post<RegisterResponse>("/api/auth/register", parsed.data);
      setAuth(data);
      router.push("/chat");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to register.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-6 shadow-sm">
      <h1 className="mb-1 text-2xl font-semibold">Create account</h1>
      <p className="mb-6 text-sm text-[var(--text-secondary)]">Start your SoulChat journey.</p>
      <form className="space-y-4" onSubmit={onSubmit}>
        <label className="block text-sm">
          Email
          <input
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2"
            type="email"
            value={form.email}
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            required
          />
        </label>
        <label className="block text-sm">
          Username
          <input
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2"
            value={form.username}
            onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
            required
          />
        </label>
        <label className="block text-sm">
          Display name
          <input
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2"
            value={form.displayName}
            onChange={(event) => setForm((prev) => ({ ...prev, displayName: event.target.value }))}
            required
          />
        </label>
        <label className="block text-sm">
          Password
          <input
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2"
            type="password"
            value={form.password}
            onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
            required
          />
        </label>
        {error ? <p className="text-sm text-red-500">{error}</p> : null}
        <button
          type="submit"
          className="w-full rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Creating account..." : "Create account"}
        </button>
      </form>
      <p className="mt-4 text-sm text-[var(--text-secondary)]">
        Already have an account?{" "}
        <Link href="/login" className="text-[var(--accent)] underline">
          Sign in
        </Link>
      </p>
    </section>
  );
}
