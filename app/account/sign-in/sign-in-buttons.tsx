"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

function GoogleGIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 48 48"
      className={className}
      focusable="false"
    >
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303C33.653 32.657 29.236 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917Z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691 12.881 19.51C14.659 15.108 18.962 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.344 6.306 14.691Z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.215 0-9.619-3.317-11.283-7.946l-6.525 5.026C9.505 39.556 16.227 44 24 44Z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303c-.792 2.235-2.231 4.166-4.084 5.57l.003-.002 6.19 5.238C36.975 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917Z"
      />
    </svg>
  );
}

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
        className="flex w-full items-center justify-center gap-3 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <GoogleGIcon className="h-5 w-5" />
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
