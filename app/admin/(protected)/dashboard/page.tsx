import { Card, SectionTitle } from "@/components/ui";
import { getAdminDashboardSummary } from "@/lib/admin";
import { formatInTimeZone } from "date-fns-tz";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const summary = await getAdminDashboardSummary();

  return (
    <div className="space-y-8">
      <SectionTitle
        eyebrow="Dashboard"
        title="School lunch operations"
        description="Monitor order volume, upcoming delivery dates, and the current payment pipeline."
      />
      <div className="grid gap-4 md:grid-cols-4">
        {[
          ["Paid orders", summary.paidOrders],
          ["Pending orders", summary.pendingOrders],
          ["Refunded orders", summary.refundedOrders],
          ["Schools", summary.schools]
        ].map(([label, value]) => (
          <Card key={label}>
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-semibold">{value}</p>
          </Card>
        ))}
      </div>
      <Card className="space-y-4">
        <h2 className="text-xl font-semibold">Upcoming delivery dates</h2>
        <div className="space-y-3">
          {summary.upcomingDeliveryDates.map((date) => (
            <div key={date.id} className="rounded-2xl border border-slate-100 p-4 text-sm text-slate-600">
              <p className="font-medium text-ink">{date.school.name}</p>
              <p>{formatInTimeZone(date.deliveryDate, date.school.timezone, "EEEE, MMMM d")}</p>
              <p>Cutoff: {formatInTimeZone(date.cutoffAt, date.school.timezone, "MMM d h:mm a zzz")}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
