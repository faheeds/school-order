import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getRequiredChoicesForMenuItem } from "@/lib/menu-config";
import { ALLOWED_SCHOOL_SLUGS } from "@/lib/school-config";
import { PageShell, SectionTitle } from "@/components/ui";
import { OrderForm } from "@/components/forms/order-form";

export const dynamic = "force-dynamic";

export default async function OrderPage({
  searchParams
}: {
  searchParams: Promise<{ reorder?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;
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

  const parent =
    session?.user?.role === "PARENT" && session.user.parentUserId
      ? await prisma.parentUser.findUnique({
        where: { id: session.user.parentUserId },
        include: {
          children: {
            where: { archivedAt: null },
            orderBy: { studentName: "asc" }
          }
        }
      })
      : null;

  const reorderOrder =
    params.reorder && parent
      ? await prisma.order.findFirst({
          where: { id: params.reorder, parentUserId: parent.id },
          include: { items: { include: { menuItem: true } }, deliveryDate: true, school: true, student: true }
        })
      : null;

  const menuItemsByDeliveryDate = Object.fromEntries(
    deliveryDates.map((date) => [date.id, date.menuAvailability.map((entry) => entry.menuItem)])
  );

  const reorderSchoolId = reorderOrder?.schoolId;
  const initialDeliveryDateId =
    reorderSchoolId && deliveryDates.some((date) => date.schoolId === reorderSchoolId)
      ? deliveryDates.find((date) => date.schoolId === reorderSchoolId)?.id
      : deliveryDates[0]?.id;

  const initialCartItems =
    reorderOrder?.items.map((item) => {
      const requiredChoices = getRequiredChoicesForMenuItem(item.menuItem.slug);
      const choice = item.additions.find((value) => requiredChoices.includes(value));
      return {
        id: item.id,
        menuItemId: item.menuItemId,
        itemName: item.itemNameSnapshot,
        choice,
        additions: item.additions.filter((value) => !requiredChoices.includes(value)),
        removals: item.removals,
        lineTotalCents: item.lineTotalCents
      };
    }) ?? [];

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
                timezone: date.school.timezone
              }
            }))}
            menuItemsByDeliveryDate={Object.fromEntries(
              Object.entries(menuItemsByDeliveryDate).map(([key, value]) => [
                key,
                value.map((item) => ({
                  id: item.id,
                  slug: item.slug,
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
            savedChildren={
              parent?.children.map((child) => ({
                id: child.id,
                schoolId: child.schoolId,
                studentName: child.studentName,
                grade: child.grade,
                allergyNotes: child.allergyNotes ?? "",
                dietaryNotes: child.dietaryNotes ?? ""
              })) ?? []
            }
            initialParentProfile={{
              parentName: parent?.name ?? "",
              parentEmail: parent?.email ?? "",
              parentChildId: reorderOrder?.parentChildId ?? parent?.children[0]?.id ?? "",
              studentName: reorderOrder?.student.studentName ?? "",
              grade: reorderOrder?.student.grade ?? "",
              allergyNotes:
                reorderOrder?.items.map((item) => item.allergyNotes).find(Boolean) ??
                reorderOrder?.student.allergyNotes ??
                ""
            }}
            initialSchoolId={reorderSchoolId ?? parent?.children[0]?.schoolId ?? ""}
            initialDeliveryDateId={initialDeliveryDateId ?? ""}
            initialCartItems={initialCartItems}
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
