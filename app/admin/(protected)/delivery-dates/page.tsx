import { addDays, set } from "date-fns";
import { revalidatePath } from "next/cache";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { prisma } from "@/lib/db";
import { ALLOWED_SCHOOL_SLUGS } from "@/lib/school-config";
import { Card, SectionTitle } from "@/components/ui";
import { SubmitButton } from "@/components/forms/submit-button";

export const dynamic = "force-dynamic";

const DEFAULT_TIMEZONE = "America/Los_Angeles";
const UPCOMING_DELIVERY_WINDOW = 10;

function zonedDate(daysOut: number, hour = 11, minute = 0, timezone = DEFAULT_TIMEZONE) {
  const base = addDays(new Date(), daysOut);
  const isoDay = formatInTimeZone(base, timezone, "yyyy-MM-dd");
  return fromZonedTime(
    `${isoDay} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`,
    timezone
  );
}

function dateAtLocalTime(dateString: string, timeString: string, timezone: string) {
  return fromZonedTime(`${dateString} ${timeString}:00`, timezone);
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

function mergeNotes(existing: string | null | undefined, nextNote: string) {
  const trimmedExisting = existing?.trim();
  const trimmedNext = nextNote.trim();

  if (!trimmedExisting) {
    return trimmedNext;
  }

  if (!trimmedNext || trimmedExisting.includes(trimmedNext)) {
    return trimmedExisting;
  }

  return `${trimmedExisting} | ${trimmedNext}`;
}

async function ensureDeliveryMenuItems(deliveryDateId: string, schoolId: string) {
  const menuItems = await prisma.menuItem.findMany({
    where: { isActive: true },
    select: { id: true }
  });

  for (const menuItem of menuItems) {
    await prisma.deliveryMenuItem.upsert({
      where: {
        deliveryDateId_menuItemId: {
          deliveryDateId,
          menuItemId: menuItem.id
        }
      },
      update: {},
      create: {
        schoolId,
        deliveryDateId,
        menuItemId: menuItem.id,
        isAvailable: true
      }
    });
  }
}

async function ensureUpcomingDeliveryDates() {
  const schools = await prisma.school.findMany({
    where: { isActive: true, slug: { in: [...ALLOWED_SCHOOL_SLUGS] } },
    orderBy: { name: "asc" }
  });

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

      await ensureDeliveryMenuItems(dateRecord.id, school.id);
    }
  }

  return schools;
}

async function scheduleDeliveryDates(formData: FormData) {
  "use server";

  const schoolIds = formData.getAll("schoolIds").map(String).filter(Boolean);
  const deliveryDate = String(formData.get("deliveryDate") ?? "");
  const cutoffTime = String(formData.get("cutoffTime") ?? "");
  const orderingOpen = formData.get("orderingOpen") === "on";
  const notes = String(formData.get("notes") ?? "").trim();

  if (!schoolIds.length || !deliveryDate || !cutoffTime) {
    return;
  }

  const schools = await prisma.school.findMany({
    where: { id: { in: schoolIds } },
    select: { id: true, timezone: true }
  });

  for (const school of schools) {
    const deliveryAt = dateAtLocalTime(deliveryDate, "11:00", school.timezone);
    const cutoffAt = dateAtLocalTime(deliveryDate, cutoffTime, school.timezone);

    const dateRecord = await prisma.deliveryDate.upsert({
      where: {
        schoolId_deliveryDate: {
          schoolId: school.id,
          deliveryDate: deliveryAt
        }
      },
      update: {
        cutoffAt,
        orderingOpen,
        notes: notes || null
      },
      create: {
        schoolId: school.id,
        deliveryDate: deliveryAt,
        cutoffAt,
        orderingOpen,
        notes: notes || null
      }
    });

    await ensureDeliveryMenuItems(dateRecord.id, school.id);
  }

  revalidatePath("/admin/delivery-dates");
}

async function removeScheduledDates(formData: FormData) {
  "use server";

  const schoolIds = formData.getAll("schoolIds").map(String).filter(Boolean);
  const deliveryDate = String(formData.get("deliveryDate") ?? "");

  if (!schoolIds.length || !deliveryDate) {
    return;
  }

  const schools = await prisma.school.findMany({
    where: { id: { in: schoolIds } },
    select: { id: true, timezone: true }
  });

  for (const school of schools) {
    const deliveryAt = dateAtLocalTime(deliveryDate, "11:00", school.timezone);
    const existing = await prisma.deliveryDate.findUnique({
      where: {
        schoolId_deliveryDate: {
          schoolId: school.id,
          deliveryDate: deliveryAt
        }
      },
      include: {
        orders: { select: { id: true } },
        weeklyCheckoutItems: { select: { id: true } }
      }
    });

    if (!existing) {
      continue;
    }

    if (existing.orders.length || existing.weeklyCheckoutItems.length) {
      await prisma.deliveryDate.update({
        where: { id: existing.id },
        data: {
          orderingOpen: false,
          notes: mergeNotes(
            existing.notes,
            "Removed from active schedule; preserved because related orders or weekly checkouts exist."
          )
        }
      });
      continue;
    }

    await prisma.deliveryDate.update({
      where: { id: existing.id },
      data: {
        orderingOpen: false,
        notes: mergeNotes(existing.notes, "Removed from active schedule.")
      }
    });
  }

  revalidatePath("/admin/delivery-dates");
}

async function updateDeliveryDateSettings(formData: FormData) {
  "use server";

  const deliveryDateId = String(formData.get("deliveryDateId") ?? "");
  const cutoffAt = String(formData.get("cutoffAt") ?? "");
  const orderingOpen = formData.get("orderingOpen") === "on";
  const notes = String(formData.get("notes") ?? "").trim();

  if (!deliveryDateId || !cutoffAt) {
    return;
  }

  await prisma.deliveryDate.update({
    where: { id: deliveryDateId },
    data: {
      cutoffAt: fromZonedTime(cutoffAt.replace("T", " ") + ":00", DEFAULT_TIMEZONE),
      orderingOpen,
      notes: notes || null
    }
  });

  revalidatePath("/admin/delivery-dates");
}

async function removeSingleDeliveryDate(formData: FormData) {
  "use server";

  const deliveryDateId = String(formData.get("deliveryDateId") ?? "");
  if (!deliveryDateId) {
    return;
  }

  const existing = await prisma.deliveryDate.findUnique({
    where: { id: deliveryDateId },
    include: {
      orders: { select: { id: true } },
      weeklyCheckoutItems: { select: { id: true } }
    }
  });

  if (!existing) {
    return;
  }

  if (existing.orders.length || existing.weeklyCheckoutItems.length) {
    await prisma.deliveryDate.update({
      where: { id: deliveryDateId },
      data: {
        orderingOpen: false,
        notes: mergeNotes(
          existing.notes,
          "Removed from active schedule; preserved because related orders or weekly checkouts exist."
        )
      }
    });
  } else {
    await prisma.deliveryDate.update({
      where: { id: deliveryDateId },
      data: {
        orderingOpen: false,
        notes: mergeNotes(existing.notes, "Removed from active schedule.")
      }
    });
  }

  revalidatePath("/admin/delivery-dates");
}

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
        orders: { select: { id: true } },
        weeklyCheckoutItems: { select: { id: true } },
        menuAvailability: { include: { menuItem: true } }
      },
      orderBy: [{ deliveryDate: "asc" }, { school: { name: "asc" } }]
    }),
    prisma.menuItem.findMany({ where: { isActive: true }, orderBy: { name: "asc" } })
  ]);

  const schoolCounts = schools.map((school) => ({
    id: school.id,
    name: school.name,
    upcomingCount: deliveryDates.filter((date) => date.schoolId === school.id).length
  }));

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="Delivery Dates"
        title="Schedule and manage delivery dates"
        description="Add or remove scheduled dates for one school or many schools at once, then fine-tune each date's cutoff time and menu availability below."
      />

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="space-y-5">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-ink">Schedule delivery dates</h2>
            <p className="text-sm text-slate-600">
              Choose one or more schools, pick a date, and set the ordering cutoff time.
            </p>
          </div>

          <form action={scheduleDeliveryDates} className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-[1fr_12rem_12rem]">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Schools</label>
                <div className="grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  {schools.map((school) => (
                    <label key={school.id} className="flex items-center gap-3 rounded-xl bg-white px-3 py-2 text-sm text-slate-700">
                      <input type="checkbox" name="schoolIds" value={school.id} className="rounded border-slate-300" />
                      <span>{school.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Delivery date</span>
                <input type="date" name="deliveryDate" className="rounded-2xl border-slate-200 text-sm" required />
              </label>

              <div className="space-y-4">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Cutoff time</span>
                  <input type="time" name="cutoffTime" className="rounded-2xl border-slate-200 text-sm" defaultValue="17:00" required />
                </label>

                <label className="flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                  <input type="checkbox" name="orderingOpen" defaultChecked />
                  Ordering open
                </label>
              </div>
            </div>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Notes</span>
              <input name="notes" placeholder="Optional note for this schedule" className="rounded-2xl border-slate-200 text-sm" />
            </label>

            <SubmitButton label="Schedule selected schools" pendingLabel="Scheduling..." />
          </form>
        </Card>

        <Card className="space-y-5">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-ink">Remove scheduled dates</h2>
            <p className="text-sm text-slate-600">
              Remove a date from one or more schools. If orders already exist, the date will be closed instead of deleted.
            </p>
          </div>

          <form action={removeScheduledDates} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Schools</label>
              <div className="grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                {schools.map((school) => (
                  <label key={school.id} className="flex items-center gap-3 rounded-xl bg-white px-3 py-2 text-sm text-slate-700">
                    <input type="checkbox" name="schoolIds" value={school.id} className="rounded border-slate-300" />
                    <span>{school.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Delivery date</span>
              <input type="date" name="deliveryDate" className="rounded-2xl border-slate-200 text-sm" required />
            </label>

            <SubmitButton label="Remove selected dates" pendingLabel="Removing..." />
          </form>

          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm font-semibold text-ink">Upcoming coverage</p>
            <div className="mt-3 grid gap-2">
              {schoolCounts.map((school) => (
                <div key={school.id} className="flex items-center justify-between text-sm text-slate-600">
                  <span>{school.name}</span>
                  <span className="font-semibold text-ink">{school.upcomingCount} dates</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        {deliveryDates.map((date) => {
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
          const hasLockedOrders = date.orders.length > 0 || date.weeklyCheckoutItems.length > 0;

          return (
            <Card key={date.id} className="space-y-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="space-y-1">
                  <p className="text-base font-semibold text-ink">{date.school.name}</p>
                  <p className="text-sm text-slate-700">
                    {formatInTimeZone(date.deliveryDate, date.school.timezone, "EEEE, MMM d")}
                  </p>
                  <p className="text-sm text-slate-500">
                    Current cutoff: {formatInTimeZone(date.cutoffAt, date.school.timezone, "MMM d h:mm a zzz")}
                  </p>
                  {date.notes ? <p className="text-sm text-slate-500">{date.notes}</p> : null}
                  {hasLockedOrders ? (
                    <p className="text-xs font-medium text-amber-700">
                      This date has existing orders or weekly checkout records, so removing it will close it instead of deleting it.
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2">
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
              </div>

              <form action={updateDeliveryDateSettings} className="grid gap-3 rounded-2xl bg-slate-50/80 p-4 lg:grid-cols-[14rem_1fr_auto]">
                <input type="hidden" name="deliveryDateId" value={date.id} />
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Adjust cutoff time</span>
                  <input
                    type="datetime-local"
                    name="cutoffAt"
                    defaultValue={formatInTimeZone(date.cutoffAt, DEFAULT_TIMEZONE, "yyyy-MM-dd'T'HH:mm")}
                    className="rounded-2xl border-slate-200 text-sm"
                    required
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Notes</span>
                  <input
                    name="notes"
                    defaultValue={date.notes ?? ""}
                    placeholder="Optional note"
                    className="rounded-2xl border-slate-200 text-sm"
                  />
                </label>
                <div className="flex flex-col gap-3 lg:justify-end">
                  <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                    <input type="checkbox" name="orderingOpen" defaultChecked={date.orderingOpen} />
                    Ordering open
                  </label>
                  <SubmitButton label="Save settings" pendingLabel="Saving..." />
                </div>
              </form>

              <form action={removeSingleDeliveryDate} className="flex justify-start">
                <input type="hidden" name="deliveryDateId" value={date.id} />
                <button
                  type="submit"
                  className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                >
                  {hasLockedOrders ? "Close this scheduled date" : "Remove this scheduled date"}
                </button>
              </form>

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
                  <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                    No items are currently available for this date.
                  </p>
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
            </Card>
          );
        })}
      </div>
    </div>
  );
}
