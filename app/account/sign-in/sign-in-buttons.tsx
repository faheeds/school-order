"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export function ParentSignInButtons({
  googleEnabled,
  appleEnabled
}: {
  googleEnabled: boolean;
  appleEnabled: boolean;
}) {
  const [message, setMessage] = useState("");

  async function handleProviderSignIn(provider: "google" | "apple", enabled: boolean) {
    if (!enabled) {
      setMessage(`${provider === "google" ? "Google" : "Apple"} sign-in is not configured yet.`);
      return;
    }

    setMessage("");
    await signIn(provider, { callbackUrl: "/account" });
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => handleProviderSignIn("google", googleEnabled)}
        disabled={!googleEnabled}
        className="w-full rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-50"
      >
        Continue with Google
      </button>
      <button
        type="button"
        onClick={() => handleProviderSignIn("apple", appleEnabled)}
        disabled={!appleEnabled}
        className="w-full rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        Continue with Apple
      </button>
      {message ? <p className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-900">{message}</p> : null}
      <p className="text-xs text-slate-500">Google and Apple sign-in only work after their OAuth credentials are added to the app environment.</p>
    </div>
  );
}
