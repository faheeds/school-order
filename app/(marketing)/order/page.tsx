import { prisma } from "@/lib/db";
import { ALLOWED_SCHOOL_SLUGS } from "@/lib/school-config";
import { PageShell, SectionTitle } from "@/components/ui";
import { OrderForm } from "@/components/forms/order-form";

export const dynamic = "force-dynamic";

export default async function OrderPage() {
  const deliveryDates = await prisma.deliveryDate.findMany({
    where: {
      orderingOpen: true,
      cutoffAt: { gt: new Date() },
      school: {
        isActive: true,
        slug: { in: [...ALLOWED_SCHOOL_SLUGS] }
      }
    },
    include: {
      school: true,
      menuAvailability: {
        where: {
          isAvailable: true,
          menuItem: {
            is: {
              isActive: true
            }
          }
        },
        include: {
          menuItem: {
            include: {
              options: {
                orderBy: { sortOrder: "asc" }
              }
            }
          }
        }
      }
    },
    orderBy: [{ deliveryDate: "asc" }, { school: { name: "asc" } }]
  });

  const menuItemsByDeliveryDate = Object.fromEntries(
    deliveryDates.map((date) => [date.id, date.menuAvailability.map((entry) => entry.menuItem)])
  );

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#f5fbf8_0%,_#fffdfa_100%)]">
      <PageShell className="space-y-8">
        <SectionTitle
          eyebrow="Parent Order Form"
          title="Place a school lunch order for next-day delivery"
          description="Ordering stays open until the configured cutoff time the day before delivery. Only available schools, dates, and menu items are shown."
        />
        {deliveryDates.length ? (
          <OrderForm
            deliveryDates={deliveryDates.map((date) => ({
              id: date.id,
              schoolId: date.schoolId,
              deliveryDate: date.deliveryDate.toISOString(),
              cutoffAt: date.cutoffAt.toISOString(),
              orderingOpen: date.orderingOpen,
              school: {
                id: date.school.id,
                name: date.school.name,
                timezone: date.school.timezone,
                collectTeacher: date.school.collectTeacher,
                collectClassroom: date.school.collectClassroom
              }
            }))}
            menuItemsByDeliveryDate={Object.fromEntries(
              Object.entries(menuItemsByDeliveryDate).map(([key, value]) => [
                key,
                value.map((item) => ({
                  id: item.id,
                  name: item.name,
                  description: item.description,
                  basePriceCents: item.basePriceCents,
                  options: item.options.map((option) => ({
                    id: option.id,
                    name: option.name,
                    optionType: option.optionType,
                    priceDeltaCents: option.priceDeltaCents
                  }))
                }))
              ])
            )}
          />
        ) : (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
            Ordering is currently closed. Please check back before the next delivery window opens.
          </div>
        )}
      </PageShell>
    </main>
  );
}
