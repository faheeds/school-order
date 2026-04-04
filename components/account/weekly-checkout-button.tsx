"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function WeeklyCheckoutButton({
  label = "Checkout upcoming week",
  className,
  fullWidth = false
}: {
  label?: string;
  className?: string;
  fullWidth?: boolean;
}) {
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
    <div className={cn("space-y-3", className)}>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className={cn(
          "rounded-full bg-brand-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60",
          fullWidth ? "w-full" : ""
        )}
      >
        {isPending ? "Starting weekly checkout..." : label}
      </button>
      {error ? <p className="rounded-2xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}
    </div>
  );
}
