import { addDays, set } from "date-fns";
import { revalidatePath } from "next/cache";
import { fromZonedTime, formatInTimeZone } from "date-fns-tz";
import { prisma } from "@/lib/db";
import { ALLOWED_SCHOOL_SLUGS } from "@/lib/school-config";
import { Card, SectionTitle } from "@/components/ui";
import { deliveryDateSchema } from "@/lib/validation/order";
import { SubmitButton } from "@/components/forms/submit-button";

export const dynamic = "force-dynamic";

const DEFAULT_TIMEZONE = "America/Los_Angeles";
const UPCOMING_DELIVERY_WINDOW = 10;

function zonedDate(daysOut: number, hour = 11, minute = 0, timezone = DEFAULT_TIMEZONE) {
  const base = addDays(new Date(), daysOut);
  const isoDay = formatInTimeZone(base, timezone, "yyyy-MM-dd");
  return fromZonedTime(`${isoDay} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`, timezone);
}

function nextBusinessDayOffsets(count: number) {
  const offsets: number[] = [];
  let daysOut = 1;

  while (offsets.length < count) {
    const candidate = addDays(new Date(), daysOut);
    const day = Number(formatInTimeZone(candidate, DEFAULT_TIMEZONE, "i"));
    if (day < 6) {
      offsets.push(daysOut);
    }
    daysOut += 1;
  }

  return offsets;
}

function startOfTodayInTimezone(timezone = DEFAULT_TIMEZONE) {
  return fromZonedTime(`${formatInTimeZone(new Date(), timezone, "yyyy-MM-dd")} 00:00:00`, timezone);
}

async function ensureUpcomingDeliveryDates() {
  const [schools, menuItems] = await Promise.all([
    prisma.school.findMany({
      where: { isActive: true, slug: { in: [...ALLOWED_SCHOOL_SLUGS] } },
      orderBy: { name: "asc" }
    }),
    prisma.menuItem.findMany({ where: { isActive: true }, select: { id: true } })
  ]);

  const deliveryOffsets = nextBusinessDayOffsets(UPCOMING_DELIVERY_WINDOW);

  for (const school of schools) {
    for (const daysOut of deliveryOffsets) {
      const deliveryDate = zonedDate(daysOut, 11, 0, school.timezone);
      const cutoffAt = set(addDays(deliveryDate, -1), {
        hours: school.defaultCutoffHour,
        minutes: school.defaultCutoffMinute,
        seconds: 0,
        milliseconds: 0
      });

      const dateRecord = await prisma.deliveryDate.upsert({
        where: {
          schoolId_deliveryDate: {
            schoolId: school.id,
            deliveryDate
          }
        },
        update: {},
        create: {
          schoolId: school.id,
          deliveryDate,
          cutoffAt,
          orderingOpen: true
        }
      });

      for (const menuItem of menuItems) {
        await prisma.deliveryMenuItem.upsert({
          where: {
            deliveryDateId_menuItemId: {
              deliveryDateId: dateRecord.id,
              menuItemId: menuItem.id
            }
          },
          update: { isAvailable: true },
          create: {
            schoolId: school.id,
            deliveryDateId: dateRecord.id,
            menuItemId: menuItem.id,
            isAvailable: true
          }
        });
      }
    }
  }

  return schools;
}

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
  const todayStart = startOfTodayInTimezone();
  const schools = await ensureUpcomingDeliveryDates();
  const [deliveryDates, menuItems] = await Promise.all([
    prisma.deliveryDate.findMany({
      where: {
        school: { slug: { in: [...ALLOWED_SCHOOL_SLUGS] } },
        deliveryDate: { gte: todayStart }
      },
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

  async function removeMenuItem(formData: FormData) {
    "use server";
    const deliveryDateId = String(formData.get("deliveryDateId"));
    const menuItemId = String(formData.get("menuItemId"));

    await prisma.deliveryMenuItem.update({
      where: { deliveryDateId_menuItemId: { deliveryDateId, menuItemId } },
      data: { isAvailable: false }
    });

    revalidatePath("/admin/delivery-dates");
  }

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="Delivery Dates"
        title="Manage upcoming delivery dates"
        description="Keep this screen focused on upcoming dates only. Remove menu items to hide them for a specific date, and restore them later if needed."
      />
      <Card className="space-y-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-ink">Create a delivery date</h2>
          <p className="text-sm text-slate-600">Add a special date manually. Upcoming business-day dates are also kept filled in automatically.</p>
        </div>
        <form action={createDeliveryDate} className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.3fr_1fr_1.2fr_1fr_auto]">
          <select name="schoolId" className="rounded-2xl border-slate-200 text-sm">
            {schools.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
          </select>
          <input type="date" name="deliveryDate" className="rounded-2xl border-slate-200 text-sm" required />
          <input type="datetime-local" name="cutoffAt" className="rounded-2xl border-slate-200 text-sm" required />
          <input name="notes" placeholder="Optional note" className="rounded-2xl border-slate-200 text-sm" />
          <label className="flex items-center gap-2 rounded-2xl border border-slate-200 px-4 text-sm text-slate-700">
            <input type="checkbox" name="orderingOpen" defaultChecked />
            Open
          </label>
          <div className="md:col-span-2 xl:col-span-5">
            <SubmitButton label="Create delivery date" pendingLabel="Saving..." />
          </div>
        </form>
      </Card>
      <div className="space-y-4">
        {deliveryDates.map((date) => (
          <Card key={date.id} className="space-y-5">
            {(() => {
              const availableEntries = date.menuAvailability
                .filter((entry) => entry.isAvailable)
                .sort((a, b) => a.menuItem.name.localeCompare(b.menuItem.name));
              const hiddenEntries = date.menuAvailability
                .filter((entry) => !entry.isAvailable)
                .sort((a, b) => a.menuItem.name.localeCompare(b.menuItem.name));
              const missingItems = menuItems.filter(
                (item) => !date.menuAvailability.some((entry) => entry.menuItemId === item.id)
              );
              const restorableItems = [...hiddenEntries.map((entry) => entry.menuItem), ...missingItems].sort((a, b) =>
                a.name.localeCompare(b.name)
              );

              return (
                <>
                  <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <p className="text-base font-semibold text-ink">{date.school.name}</p>
                      <p className="text-sm text-slate-700">{formatInTimeZone(date.deliveryDate, date.school.timezone, "EEEE, MMM d")}</p>
                      <p className="text-sm text-slate-500">Cutoff: {formatInTimeZone(date.cutoffAt, date.school.timezone, "MMM d h:mm a zzz")}</p>
                      {date.notes ? <p className="text-sm text-slate-500">{date.notes}</p> : null}
                    </div>
                    <span
                      className={
                        date.orderingOpen
                          ? "inline-flex w-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                          : "inline-flex w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
                      }
                    >
                      {date.orderingOpen ? "Ordering open" : "Ordering closed"}
                    </span>
                  </div>

                  <section className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold text-ink">Available items</h3>
                      <p className="text-xs text-slate-500">{availableEntries.length} visible</p>
                    </div>
                    {availableEntries.length ? (
                      <div className="flex flex-wrap gap-2">
                        {availableEntries.map((entry) => (
                          <form key={entry.id} action={removeMenuItem}>
                            <input type="hidden" name="deliveryDateId" value={date.id} />
                            <input type="hidden" name="menuItemId" value={entry.menuItemId} />
                            <button
                              type="submit"
                              className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-3 py-1.5 text-sm text-brand-900 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                            >
                              <span>{entry.menuItem.name}</span>
                              <span className="text-xs font-semibold">Remove</span>
                            </button>
                          </form>
                        ))}
                      </div>
                    ) : (
                      <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">No items are currently available for this date.</p>
                    )}
                  </section>

                  <section className="space-y-3 rounded-2xl bg-slate-50/80 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-ink">Restore or add items</h3>
                        <p className="text-xs text-slate-500">Choose only the items you want to add back to this date.</p>
                      </div>
                      <p className="text-xs text-slate-500">{restorableItems.length} hidden</p>
                    </div>
                    {restorableItems.length ? (
                      <form action={attachMenuItems} className="space-y-3">
                        <input type="hidden" name="deliveryDateId" value={date.id} />
                        <input type="hidden" name="schoolId" value={date.schoolId} />
                        <select
                          name="menuItemIds"
                          multiple
                          size={Math.min(Math.max(restorableItems.length, 4), 8)}
                          className="min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700"
                        >
                          {restorableItems.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-slate-500">Hold Ctrl or Cmd to select multiple items.</p>
                        <SubmitButton label="Add selected items" pendingLabel="Saving..." />
                      </form>
                    ) : (
                      <p className="text-sm text-slate-500">All active menu items are already available for this date.</p>
                    )}
                  </section>
                </>
              );
            })()}
          </Card>
        ))}
      </div>
    </div>
  );
}
