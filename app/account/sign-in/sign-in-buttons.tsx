"use client";

import { signIn } from "next-auth/react";

export function ParentSignInButtons() {
  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => signIn("google", { callbackUrl: "/account" })}
        className="w-full rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-ink"
      >
        Continue with Google
      </button>
      <button
        type="button"
        onClick={() => signIn("apple", { callbackUrl: "/account" })}
        className="w-full rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white"
      >
        Continue with Apple
      </button>
      <p className="text-xs text-slate-500">If a provider is not configured yet, the sign-in button will not complete until its credentials are added.</p>
    </div>
  );
}
