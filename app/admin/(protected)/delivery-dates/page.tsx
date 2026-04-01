import { revalidatePath } from "next/cache";
import { fromZonedTime, formatInTimeZone } from "date-fns-tz";
import { prisma } from "@/lib/db";
import { ALLOWED_SCHOOL_SLUGS } from "@/lib/school-config";
import { Card, SectionTitle } from "@/components/ui";
import { deliveryDateSchema } from "@/lib/validation/order";
import { SubmitButton } from "@/components/forms/submit-button";

export const dynamic = "force-dynamic";

async function createDeliveryDate(formData: FormData) {
  "use server";
  const parsed = deliveryDateSchema.parse({
    schoolId: formData.get("schoolId"),
    deliveryDate: formData.get("deliveryDate"),
    cutoffAt: formData.get("cutoffAt"),
    orderingOpen: formData.get("orderingOpen") === "on",
    notes: formData.get("notes")
  });

  await prisma.deliveryDate.create({
    data: {
      schoolId: parsed.schoolId,
      deliveryDate: fromZonedTime(`${parsed.deliveryDate} 11:00:00`, "America/Los_Angeles"),
      cutoffAt: fromZonedTime(parsed.cutoffAt.replace("T", " ") + ":00", "America/Los_Angeles"),
      orderingOpen: parsed.orderingOpen,
      notes: parsed.notes || null
    }
  });
  revalidatePath("/admin/delivery-dates");
}

export default async function DeliveryDatesPage() {
  const [schools, deliveryDates, menuItems] = await Promise.all([
    prisma.school.findMany({
      where: { isActive: true, slug: { in: [...ALLOWED_SCHOOL_SLUGS] } },
      orderBy: { name: "asc" }
    }),
    prisma.deliveryDate.findMany({
      where: { school: { slug: { in: [...ALLOWED_SCHOOL_SLUGS] } } },
      include: {
        school: true,
        menuAvailability: { include: { menuItem: true } }
      },
      orderBy: { deliveryDate: "asc" }
    }),
    prisma.menuItem.findMany({ where: { isActive: true }, orderBy: { name: "asc" } })
  ]);

  async function attachMenuItems(formData: FormData) {
    "use server";
    const deliveryDateId = String(formData.get("deliveryDateId"));
    const schoolId = String(formData.get("schoolId"));
    const menuItemIds = formData.getAll("menuItemIds").map(String);

    for (const menuItemId of menuItemIds) {
      await prisma.deliveryMenuItem.upsert({
        where: { deliveryDateId_menuItemId: { deliveryDateId, menuItemId } },
        update: { isAvailable: true },
        create: { deliveryDateId, menuItemId, schoolId, isAvailable: true }
      });
    }
    revalidatePath("/admin/delivery-dates");
  }

  return (
    <div className="space-y-8">
      <SectionTitle eyebrow="Delivery Dates" title="Manage per-school delivery dates and menu availability" />
      <Card>
        <form action={createDeliveryDate} className="grid gap-4 md:grid-cols-5">
          <select name="schoolId" className="rounded-2xl border-slate-200">
            {schools.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
          </select>
          <input type="date" name="deliveryDate" className="rounded-2xl border-slate-200" required />
          <input type="datetime-local" name="cutoffAt" className="rounded-2xl border-slate-200" required />
          <input name="notes" placeholder="Notes" className="rounded-2xl border-slate-200" />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="orderingOpen" defaultChecked /> Open</label>
          <SubmitButton label="Create delivery date" pendingLabel="Saving..." />
        </form>
      </Card>
      <div className="space-y-4">
        {deliveryDates.map((date) => (
          <Card key={date.id} className="space-y-4">
            <div className="text-sm text-slate-600">
              <p className="font-semibold text-ink">{date.school.name}</p>
              <p>{formatInTimeZone(date.deliveryDate, date.school.timezone, "EEEE, MMM d")}</p>
              <p>Cutoff: {formatInTimeZone(date.cutoffAt, date.school.timezone, "MMM d h:mm a zzz")}</p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {date.menuAvailability.map((entry) => (
                <span key={entry.id} className="rounded-full bg-brand-50 px-3 py-1">
                  {entry.menuItem.name}
                </span>
              ))}
            </div>
            <form action={attachMenuItems} className="space-y-3">
              <input type="hidden" name="deliveryDateId" value={date.id} />
              <input type="hidden" name="schoolId" value={date.schoolId} />
              <div className="flex flex-wrap gap-3">
                {menuItems.map((item) => (
                  <label key={item.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="menuItemIds" value={item.id} />
                    {item.name}
                  </label>
                ))}
              </div>
              <SubmitButton label="Attach items" pendingLabel="Saving..." />
            </form>
          </Card>
        ))}
      </div>
    </div>
  );
}
