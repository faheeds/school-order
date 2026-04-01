"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export function LoginForm() {
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const formData = new FormData(event.currentTarget);

    const response = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false
    });

    if (response?.error) {
      setError("Invalid email or password.");
      return;
    }

    window.location.href = "/admin/dashboard";
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block space-y-2">
        <span className="text-sm font-medium">Email</span>
        <input type="email" name="email" required className="w-full rounded-2xl border-slate-200" />
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-medium">Password</span>
        <input type="password" name="password" required className="w-full rounded-2xl border-slate-200" />
      </label>
      {error ? <p className="rounded-2xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}
      <button type="submit" className="w-full rounded-full bg-brand-600 px-5 py-3 text-sm font-semibold text-white">
        Sign in
      </button>
    </form>
  );
}
