"use client";

import { useState, useTransition } from "react";

export function OrderStatusActions({ orderId }: { orderId: string }) {
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  async function update(action: string) {
    startTransition(async () => {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      const data = await response.json();
      setMessage(response.ok ? "Updated." : data.error || "Unable to update order.");
      if (response.ok) {
        window.location.reload();
      }
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button disabled={isPending} onClick={() => update("resend_confirmation")} className="rounded-full border px-3 py-1 text-xs">
          Resend email
        </button>
        <button disabled={isPending} onClick={() => update("refund")} className="rounded-full border px-3 py-1 text-xs">
          Mark refunded
        </button>
        <button disabled={isPending} onClick={() => update("cancel")} className="rounded-full border px-3 py-1 text-xs">
          Cancel
        </button>
      </div>
      {message ? <p className="text-xs text-slate-500">{message}</p> : null}
    </div>
  );
}
