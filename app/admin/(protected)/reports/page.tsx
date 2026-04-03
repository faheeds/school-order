import { Card, SectionTitle } from "@/components/ui";
import { prisma } from "@/lib/db";
import { getAdminReports } from "@/lib/admin";
import { ALLOWED_SCHOOL_SLUGS } from "@/lib/school-config";
import { formatCurrency } from "@/lib/utils";
import { formatInTimeZone } from "date-fns-tz";

export const dynamic = "force-dynamic";

function normalizeMultiValue(value: string | string[] | undefined) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
}

export default async function AdminReportsPage({
  searchParams
}: {
  searchParams: Promise<{
    schoolIds?: string | string[];
    deliveryDateId?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
}) {
  const params = await searchParams;
  const selectedSchoolIds = normalizeMultiValue(params.schoolIds);

  const [schools, deliveryDates, reports] = await Promise.all([
    prisma.school.findMany({
      where: { isActive: true, slug: { in: [...ALLOWED_SCHOOL_SLUGS] } },
      orderBy: { name: "asc" }
    }),
    prisma.deliveryDate.findMany({
      where: {
        school: { slug: { in: [...ALLOWED_SCHOOL_SLUGS] } },
        schoolId: selectedSchoolIds.length ? { in: selectedSchoolIds } : undefined
      },
      include: { school: true },
      orderBy: { deliveryDate: "asc" }
    }),
    getAdminReports({
      schoolIds: selectedSchoolIds,
      deliveryDateId: params.deliveryDateId,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo
    })
  ]);

  return (
    <div className="space-y-8">
      <SectionTitle
        eyebrow="Reports"
        title="Sales, menu performance, and school breakdowns"
        description="Track which items sell most, how much revenue each school generates, and overall paid order volume."
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
          <input type="date" name="dateFrom" defaultValue={params.dateFrom ?? ""} className="rounded-2xl border-slate-200" />
          <input type="date" name="dateTo" defaultValue={params.dateTo ?? ""} className="rounded-2xl border-slate-200" />
          <button type="submit" className="rounded-full bg-brand-600 px-5 py-3 text-sm font-semibold text-white">
            Apply filters
          </button>
        </form>
        <p className="mt-3 text-xs text-slate-500">Hold Ctrl (Windows) or Command (Mac) to select multiple schools.</p>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm text-slate-500">Paid orders</p>
          <p className="mt-2 text-3xl font-semibold">{reports.totals.totalOrders}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Items sold</p>
          <p className="mt-2 text-3xl font-semibold">{reports.totals.totalItemsSold}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Sales</p>
          <p className="mt-2 text-3xl font-semibold">{formatCurrency(reports.totals.totalSalesCents)}</p>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
        <Card className="space-y-4">
          <h2 className="text-xl font-semibold">Breakdown by school</h2>
          <div className="space-y-3">
            {reports.schoolBreakdown.length ? (
              reports.schoolBreakdown.map((school) => (
                <div key={school.schoolId} className="rounded-2xl border border-slate-100 p-4 text-sm text-slate-600">
                  <p className="font-semibold text-ink">{school.schoolName}</p>
                  <p className="mt-1">Orders: {school.orders}</p>
                  <p>Items sold: {school.itemsSold}</p>
                  <p>Sales: {formatCurrency(school.salesCents)}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No paid orders match the current filters.</p>
            )}
          </div>
        </Card>

        <Card className="space-y-4">
          <h2 className="text-xl font-semibold">Menu item performance</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="pb-3 pr-4 font-medium">Menu item</th>
                  <th className="pb-3 pr-4 font-medium">Ordered</th>
                  <th className="pb-3 pr-4 font-medium">Sales</th>
                  <th className="pb-3 font-medium">School breakdown</th>
                </tr>
              </thead>
              <tbody>
                {reports.itemBreakdown.length ? (
                  reports.itemBreakdown.map((item) => (
                    <tr key={item.itemName} className="border-b border-slate-100 align-top">
                      <td className="py-3 pr-4 font-medium text-ink">{item.itemName}</td>
                      <td className="py-3 pr-4 text-slate-600">{item.quantity}</td>
                      <td className="py-3 pr-4 text-slate-600">{formatCurrency(item.salesCents)}</td>
                      <td className="py-3 text-slate-600">
                        {Object.entries(item.bySchool)
                          .map(([schoolName, count]) => `${schoolName}: ${count}`)
                          .join(" | ")}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-4 text-slate-500">
                      No item sales match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
