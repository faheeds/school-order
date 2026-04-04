import Link from "next/link";
import { Card, SectionTitle } from "@/components/ui";
import { prisma } from "@/lib/db";
import { listOrders } from "@/lib/orders";
import { ALLOWED_SCHOOL_SLUGS } from "@/lib/school-config";
import { OrdersList } from "@/components/admin/orders-list";
import { formatInTimeZone } from "date-fns-tz";

export const dynamic = "force-dynamic";

function normalizeMultiValue(value: string | string[] | undefined) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
}

export default async function AdminOrdersPage({
  searchParams
}: {
  searchParams: Promise<{ deliveryDateId?: string; schoolIds?: string | string[]; status?: string; archived?: string }>;
}) {
  const params = await searchParams;
  const selectedSchoolIds = normalizeMultiValue(params.schoolIds);
  const [orders, schools, deliveryDates] = await Promise.all([
    listOrders({
      deliveryDateId: params.deliveryDateId,
      schoolIds: selectedSchoolIds,
      status: params.status,
      archived: params.archived
    }),
    prisma.school.findMany({ where: { isActive: true, slug: { in: [...ALLOWED_SCHOOL_SLUGS] } }, orderBy: { name: "asc" } }),
    prisma.deliveryDate.findMany({
      where: {
        school: { slug: { in: [...ALLOWED_SCHOOL_SLUGS] } },
        schoolId: selectedSchoolIds.length ? { in: selectedSchoolIds } : undefined
      },
      include: { school: true },
      orderBy: { deliveryDate: "asc" }
    })
  ]);

  return (
    <div className="space-y-8">
      <SectionTitle
        eyebrow="Orders"
        title="Filter, export, and label paid student orders"
        description="Pending checkout attempts stay out of the main admin workflow by default. Use the actions column to resend confirmations, refund, cancel, or archive completed records."
      />
      <Card>
        <form className="grid gap-4 md:grid-cols-5">
          <select name="schoolIds" multiple defaultValue={selectedSchoolIds} className="min-h-32 rounded-2xl border-slate-200">
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
                {formatInTimeZone(date.deliveryDate, date.school.timezone, "EEE, MMM d")}
              </option>
            ))}
          </select>
          <select name="status" defaultValue={params.status ?? "ALL"} className="rounded-2xl border-slate-200">
            <option value="ALL">All admin statuses</option>
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
        <p className="mt-3 text-xs text-slate-500">Hold Ctrl (Windows) or Command (Mac) to select multiple schools.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href={`/admin/orders/labels-print${params.deliveryDateId ? `?deliveryDateId=${params.deliveryDateId}` : ""}`}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm"
          >
            Print labels
          </Link>
          <a
            href={`/api/admin/labels${params.deliveryDateId ? `?deliveryDateId=${params.deliveryDateId}` : ""}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-slate-200 px-4 py-2 text-sm"
          >
            Labels PDF
          </a>
          <a
            href={`/api/admin/export${params.deliveryDateId ? `?deliveryDateId=${params.deliveryDateId}` : ""}`}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm"
          >
            Export CSV
          </a>
        </div>
      </Card>
      <OrdersList orders={orders} />
    </div>
  );
}
