import Link from "next/link";
import { Card, SectionTitle } from "@/components/ui";
import { prisma } from "@/lib/db";
import { listOrders } from "@/lib/orders";
import { ALLOWED_SCHOOL_SLUGS } from "@/lib/school-config";
import { formatCurrency, formatList } from "@/lib/utils";
import { OrderStatusActions } from "@/components/admin/order-status-actions";
import { formatInTimeZone } from "date-fns-tz";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage({
  searchParams
}: {
  searchParams: Promise<{ deliveryDateId?: string; schoolId?: string; status?: string; archived?: string }>;
}) {
  const params = await searchParams;
  const [orders, schools, deliveryDates] = await Promise.all([
    listOrders(params),
    prisma.school.findMany({ where: { isActive: true, slug: { in: [...ALLOWED_SCHOOL_SLUGS] } }, orderBy: { name: "asc" } }),
    prisma.deliveryDate.findMany({
      where: { school: { slug: { in: [...ALLOWED_SCHOOL_SLUGS] } } },
      include: { school: true },
      orderBy: { deliveryDate: "asc" }
    })
  ]);

  return (
    <div className="space-y-8">
      <SectionTitle
        eyebrow="Orders"
        title="Filter, export, and label paid student orders"
        description="Archived orders are hidden by default. Use the actions column to resend confirmations, refund, cancel, or archive old records."
      />
      <Card>
        <form className="grid gap-4 md:grid-cols-5">
          <select name="schoolId" defaultValue={params.schoolId ?? ""} className="rounded-2xl border-slate-200">
            <option value="">All schools</option>
            {schools.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
          </select>
          <select name="deliveryDateId" defaultValue={params.deliveryDateId ?? ""} className="rounded-2xl border-slate-200">
            <option value="">All delivery dates</option>
            {deliveryDates.map((date) => (
              <option key={date.id} value={date.id}>
                {date.school.name} - {formatInTimeZone(date.deliveryDate, date.school.timezone, "EEE, MMM d")}
              </option>
            ))}
          </select>
          <select name="status" defaultValue={params.status ?? "ALL"} className="rounded-2xl border-slate-200">
            <option value="ALL">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="PAID">Paid</option>
            <option value="REFUNDED">Refunded</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <select name="archived" defaultValue={params.archived ?? "exclude"} className="rounded-2xl border-slate-200">
            <option value="exclude">Active only</option>
            <option value="include">Active + archived</option>
            <option value="only">Archived only</option>
          </select>
          <button type="submit" className="rounded-full bg-brand-600 px-5 py-3 text-sm font-semibold text-white">
            Apply filters
          </button>
        </form>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href={`/admin/orders/labels-print${params.deliveryDateId ? `?deliveryDateId=${params.deliveryDateId}` : ""}`}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm"
          >
            Print labels
          </Link>
          <Link
            href={`/api/admin/labels${params.deliveryDateId ? `?deliveryDateId=${params.deliveryDateId}` : ""}`}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm"
          >
            Labels PDF
          </Link>
          <Link
            href={`/api/admin/export${params.deliveryDateId ? `?deliveryDateId=${params.deliveryDateId}` : ""}`}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm"
          >
            Export CSV
          </Link>
        </div>
      </Card>
      <div className="space-y-4">
        {orders.map((order) => (
          <Card key={order.id} className="grid gap-4 lg:grid-cols-[1.3fr_1fr_0.8fr]">
            <div className="space-y-2 text-sm text-slate-600">
              <p className="text-base font-semibold text-ink">{order.student.studentName}</p>
              <p>
                {order.school.name} | Grade {order.student.grade}
              </p>
              <p>
                Delivery: {formatInTimeZone(order.deliveryDate.deliveryDate, order.school.timezone, "EEEE, MMM d")}
              </p>
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
    </div>
  );
}
