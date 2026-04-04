"use client";

import { useState } from "react";

export function WeeklyCheckoutButton() {
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);

  async function handleClick() {
    setIsPending(true);
    setError("");
    const response = await fetch("/api/account/weekly-checkout", {
      method: "POST"
    });
    const data = await response.json();
    setIsPending(false);

    if (!response.ok) {
      setError(data.error || "Unable to start weekly checkout.");
      return;
    }

    window.location.href = data.checkoutUrl;
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="rounded-full bg-brand-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isPending ? "Starting weekly checkout..." : "Checkout upcoming week"}
      </button>
      {error ? <p className="rounded-2xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}
    </div>
  );
}
