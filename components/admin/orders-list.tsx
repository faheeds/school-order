"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Card } from "@/components/ui";
import { OrderStatusActions } from "@/components/admin/order-status-actions";
import { formatCurrency, formatList } from "@/lib/utils";

type OrderListItem = {
  id: string;
  orderNumber: string;
  status: string;
  archivedAt: string | Date | null;
  createdAt: string | Date;
  totalCents: number;
  specialInstructions: string | null;
  parentName: string;
  parentEmail: string;
  school: {
    name: string;
    timezone: string;
  };
  deliveryDate: {
    deliveryDate: string | Date;
  };
  student: {
    studentName: string;
    grade: string;
    teacherName: string | null;
    classroom: string | null;
    allergyNotes: string | null;
  };
  items: {
    itemNameSnapshot: string;
    additions: string[];
    removals: string[];
    allergyNotes: string | null;
  }[];
};

function formatDeliveryDate(value: string | Date, timezone: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone: timezone
  }).format(new Date(value));
}

function formatOrderTimestamp(value: string | Date, timezone: string) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone
  }).format(new Date(value));
}

export function OrdersList({ orders }: { orders: OrderListItem[] }) {
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const selectedCount = selectedOrderIds.length;
  const allSelected = useMemo(
    () => orders.length > 0 && orders.every((order) => selectedOrderIds.includes(order.id)),
    [orders, selectedOrderIds]
  );

  function toggleOrder(orderId: string) {
    setSelectedOrderIds((current) =>
      current.includes(orderId) ? current.filter((id) => id !== orderId) : [...current, orderId]
    );
  }

  function toggleAll() {
    setSelectedOrderIds(allSelected ? [] : orders.map((order) => order.id));
  }

  function runBulkAction(action: "archive" | "cancel" | "resend_confirmation") {
    if (!selectedOrderIds.length) {
      setMessage("Select at least one order first.");
      return;
    }

    startTransition(async () => {
      const response = await fetch("/api/admin/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, orderIds: selectedOrderIds })
      });
      const data = await response.json();
      setMessage(response.ok ? `Updated ${data.updated} order${data.updated === 1 ? "" : "s"}.` : data.error || "Unable to update selected orders.");
      if (response.ok) {
        setSelectedOrderIds([]);
        window.location.reload();
      }
    });
  }

  if (!orders.length) {
    return (
      <Card>
        <p className="text-sm text-slate-600">No orders match the current filters.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={allSelected} onChange={toggleAll} className="rounded border-slate-300" />
              <span>Select all visible</span>
            </label>
            <p className="text-sm text-slate-600">{selectedCount} selected</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isPending || !selectedCount}
              onClick={() => runBulkAction("archive")}
              className="rounded-full border px-4 py-2 text-sm disabled:opacity-60"
            >
              Bulk archive
            </button>
            <button
              type="button"
              disabled={isPending || !selectedCount}
              onClick={() => runBulkAction("cancel")}
              className="rounded-full border px-4 py-2 text-sm disabled:opacity-60"
            >
              Bulk cancel
            </button>
            <button
              type="button"
              disabled={isPending || !selectedCount}
              onClick={() => runBulkAction("resend_confirmation")}
              className="rounded-full border px-4 py-2 text-sm disabled:opacity-60"
            >
              Bulk resend email
            </button>
          </div>
        </div>
        {message ? <p className="text-sm text-slate-500">{message}</p> : null}
      </Card>

      {orders.map((order) => (
        <Card key={order.id} className="grid gap-4 lg:grid-cols-[auto_1.3fr_1fr_0.8fr]">
          <div className="pt-1">
            <input
              type="checkbox"
              checked={selectedOrderIds.includes(order.id)}
              onChange={() => toggleOrder(order.id)}
              className="h-4 w-4 rounded border-slate-300"
              aria-label={`Select order ${order.orderNumber}`}
            />
          </div>
          <div className="space-y-2 text-sm text-slate-600">
            <p className="text-base font-semibold text-ink">{order.student.studentName}</p>
            <p>
              {order.school.name} | Grade {order.student.grade}
            </p>
            <p>Delivery: {formatDeliveryDate(order.deliveryDate.deliveryDate, order.school.timezone)}</p>
            <p>Teacher/classroom: {order.student.teacherName || "n/a"} / {order.student.classroom || "n/a"}</p>
            <p>Parent: {order.parentName} ({order.parentEmail})</p>
          </div>
          <div className="space-y-2 text-sm text-slate-600">
            <p className="font-medium text-ink">{order.items.map((item) => item.itemNameSnapshot).join(", ")}</p>
            <p>Additions: {formatList(order.items.flatMap((item) => item.additions))}</p>
            <p>Removals: {formatList(order.items.flatMap((item) => item.removals))}</p>
            <p>Allergy: {order.items.map((item) => item.allergyNotes).find(Boolean) || order.student.allergyNotes || "None"}</p>
            <p>Special: {order.specialInstructions || "None"}</p>
          </div>
          <div className="space-y-2 text-sm text-slate-600">
            <p className="font-medium text-ink">{order.orderNumber}</p>
            <p>Status: {order.status}</p>
            <p>Order date/time: {formatOrderTimestamp(order.createdAt, order.school.timezone)}</p>
            <p>Archived: {order.archivedAt ? "Yes" : "No"}</p>
            <p>Total: {formatCurrency(order.totalCents)}</p>
            <Link href={`/admin/orders/${order.id}`} className="text-xs font-medium text-brand-700">
              Edit order
            </Link>
            <OrderStatusActions orderId={order.id} isArchived={Boolean(order.archivedAt)} />
          </div>
        </Card>
      ))}
    </div>
  );
}
