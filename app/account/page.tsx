import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { Card, PageShell, SectionTitle } from "@/components/ui";
import { SubmitButton } from "@/components/forms/submit-button";
import { WeeklyCheckoutButton } from "@/components/account/weekly-checkout-button";
import { WeeklyPlanPlanner } from "@/components/account/weekly-plan-planner";
import { prisma } from "@/lib/db";
import { signOut } from "@/lib/auth";
import { requireParent } from "@/lib/parent-auth";
import { ALLOWED_SCHOOL_SLUGS } from "@/lib/school-config";
import { getUpcomingSchoolWeekRange, getWeekdayNumber } from "@/lib/weekly-week";

export default async function ParentAccountPage() {
  const session = await requireParent();
  const parentUserId = session.user?.parentUserId;

  if (!parentUserId) {
    redirect("/account/sign-in");
  }

  async function addChild(formData: FormData) {
    "use server";
    const session = await requireParent();
    const parentUserId = session.user?.parentUserId;
    if (!parentUserId) {
      redirect("/account/sign-in");
    }
    await prisma.parentChild.create({
      data: {
        parentUserId,
        schoolId: String(formData.get("schoolId")),
        studentName: String(formData.get("studentName")),
        grade: String(formData.get("grade")),
        allergyNotes: String(formData.get("allergyNotes") || "") || null,
        dietaryNotes: String(formData.get("dietaryNotes") || "") || null
      }
    });
    revalidatePath("/account");
    redirect("/account");
  }

  async function updateChild(formData: FormData) {
    "use server";
    const session = await requireParent();
    const parentUserId = session.user?.parentUserId;
    if (!parentUserId) {
      redirect("/account/sign-in");
    }

    const childId = String(formData.get("childId") || "");

    await prisma.parentChild.updateMany({
      where: {
        id: childId,
        parentUserId,
        archivedAt: null
      },
      data: {
        schoolId: String(formData.get("schoolId")),
        studentName: String(formData.get("studentName")),
        grade: String(formData.get("grade")),
        allergyNotes: String(formData.get("allergyNotes") || "") || null,
        dietaryNotes: String(formData.get("dietaryNotes") || "") || null
      }
    });

    revalidatePath("/account");
    redirect("/account");
  }

  async function archiveChild(formData: FormData) {
    "use server";
    const session = await requireParent();
    const parentUserId = session.user?.parentUserId;
    if (!parentUserId) {
      redirect("/account/sign-in");
    }

    const childId = String(formData.get("childId") || "");

    const child = await prisma.parentChild.findFirst({
      where: {
        id: childId,
        parentUserId,
        archivedAt: null
      }
    });

    if (!child) {
      revalidatePath("/account");
      redirect("/account");
    }

    await prisma.$transaction([
      prisma.weeklyLunchPlan.deleteMany({
        where: {
          parentUserId,
          parentChildId: childId
        }
      }),
      prisma.parentChild.update({
        where: { id: childId },
        data: { archivedAt: new Date() }
      })
    ]);

    revalidatePath("/account");
    redirect("/account");
  }

  const [parent, schools, menuItems, orders] = await Promise.all([
    prisma.parentUser.findUnique({
      where: { id: parentUserId },
      include: {
        children: {
          where: { archivedAt: null },
          include: { school: true },
          orderBy: { studentName: "asc" }
        },
        weeklyPlans: {
          where: {
            parentChild: {
              archivedAt: null
            }
          },
          include: {
            parentChild: true,
            menuItem: true,
            school: true
          },
          orderBy: [{ weekday: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }]
        }
      }
    }),
    prisma.school.findMany({
      where: { isActive: true, slug: { in: [...ALLOWED_SCHOOL_SLUGS] } },
      orderBy: { name: "asc" }
    }),
    prisma.menuItem.findMany({
      where: { isActive: true },
      include: {
        options: {
          orderBy: { sortOrder: "asc" }
        }
      },
      orderBy: { name: "asc" }
    }),
    prisma.order.findMany({
      where: { parentUserId, archivedAt: null },
      include: {
        school: true,
        deliveryDate: true,
        student: true,
        items: true
      },
      orderBy: { createdAt: "desc" },
      take: 12
    })
  ]);

  if (!parent) {
    redirect("/account/sign-in");
  }

  const now = new Date();
  const schoolsById = new Map(parent.children.map((child) => [child.schoolId, child.school] as const));
  const uniqueSchoolIds = [...new Set(parent.children.map((child) => child.schoolId))];
  const weeklyAvailabilityEntries = await Promise.all(
    uniqueSchoolIds.map(async (schoolId) => {
      const school = schoolsById.get(schoolId);
      if (!school) {
        return null;
      }

      const range = getUpcomingSchoolWeekRange(now, school.timezone);
      const deliveryDates = await prisma.deliveryDate.findMany({
        where: {
          schoolId,
          orderingOpen: true,
          cutoffAt: { gt: now },
          deliveryDate: { gte: range.start, lte: range.end }
        },
        include: {
          menuAvailability: {
            where: { isAvailable: true },
            select: { menuItemId: true }
          }
        },
        orderBy: { deliveryDate: "asc" }
      });

      const eligibleWeekdays: number[] = [];
      const menuItemIdsByWeekday: Record<string, string[]> = {};
      const deliveryDateIsoByWeekday: Record<string, string> = {};

      for (const deliveryDate of deliveryDates) {
        const weekday = getWeekdayNumber(deliveryDate.deliveryDate, school.timezone);
        if (weekday < 1 || weekday > 7) {
          continue;
        }

        const key = String(weekday);
        if (menuItemIdsByWeekday[key]) {
          continue;
        }

        eligibleWeekdays.push(weekday);
        menuItemIdsByWeekday[key] = [...new Set(deliveryDate.menuAvailability.map((entry) => entry.menuItemId))].sort();
        deliveryDateIsoByWeekday[key] = deliveryDate.deliveryDate.toISOString();
      }

      return [
        schoolId,
        {
          eligibleWeekdays: [...new Set(eligibleWeekdays)].sort((a, b) => a - b),
          menuItemIdsByWeekday,
          deliveryDateIsoByWeekday
        }
      ] as const;
    })
  );
  const weeklyAvailabilityBySchoolId = Object.fromEntries(
    weeklyAvailabilityEntries.filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
  );

  const activeWeeklyPlanCount = parent.weeklyPlans.filter((plan) => plan.isActive).length;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#f5fbf8_0%,_#fffdfa_100%)]">
      <PageShell className="space-y-8 pb-28 lg:pb-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <SectionTitle
            eyebrow="Parent Account"
            title={`Welcome${parent.name ? `, ${parent.name}` : ""}`}
            description="Save your children, plan lunches for the week, and reorder past lunches with fewer clicks."
          />
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button type="submit" className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold">
              Sign out
            </button>
          </form>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <Card className="space-y-4 xl:order-1">
            <h2 className="text-xl font-semibold">Saved children</h2>
            <details className="group rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <summary className="cursor-pointer list-none font-semibold text-ink">
                View saved children
              </summary>
              <div className="mt-4 space-y-3">
                {parent.children.length ? (
                  parent.children.map((child) => (
                    <div key={child.id} className="rounded-2xl border border-slate-100 bg-white p-4 text-sm text-slate-600">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="font-semibold text-ink">{child.studentName}</p>
                          <p>{child.school.name} | Grade {child.grade}</p>
                          <p>Allergy notes: {child.allergyNotes || "None"}</p>
                        </div>
                        <form action={archiveChild}>
                          <input type="hidden" name="childId" value={child.id} />
                          <button
                            type="submit"
                            className="rounded-full border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-700"
                          >
                            Delete child
                          </button>
                        </form>
                      </div>

                      <details className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                        <summary className="cursor-pointer list-none font-semibold text-ink">Edit details</summary>
                        <form action={updateChild} className="mt-4 grid gap-4 md:grid-cols-2">
                          <input type="hidden" name="childId" value={child.id} />
                          <select name="schoolId" className="rounded-2xl border-slate-200" required defaultValue={child.schoolId}>
                            {schools.map((school) => (
                              <option key={school.id} value={school.id}>
                                {school.name}
                              </option>
                            ))}
                          </select>
                          <input
                            name="studentName"
                            defaultValue={child.studentName}
                            placeholder="Student name"
                            className="rounded-2xl border-slate-200"
                            required
                          />
                          <input name="grade" defaultValue={child.grade} placeholder="Grade" className="rounded-2xl border-slate-200" required />
                          <input
                            name="allergyNotes"
                            defaultValue={child.allergyNotes ?? ""}
                            placeholder="Allergy notes"
                            className="rounded-2xl border-slate-200"
                          />
                          <input
                            name="dietaryNotes"
                            defaultValue={child.dietaryNotes ?? ""}
                            placeholder="Dietary notes"
                            className="rounded-2xl border-slate-200 md:col-span-2"
                          />
                          <SubmitButton label="Save changes" pendingLabel="Saving..." />
                        </form>
                      </details>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">No saved children yet.</p>
                )}
              </div>
            </details>

            <details className="group rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <summary className="cursor-pointer list-none font-semibold text-ink">
                Add a child
              </summary>
              <form action={addChild} className="mt-4 grid gap-4 md:grid-cols-2">
                <select name="schoolId" className="rounded-2xl border-slate-200" required>
                  <option value="">Select school</option>
                  {schools.map((school) => (
                    <option key={school.id} value={school.id}>
                      {school.name}
                    </option>
                  ))}
                </select>
                <input name="studentName" placeholder="Student name" className="rounded-2xl border-slate-200" required />
                <input name="grade" placeholder="Grade" className="rounded-2xl border-slate-200" required />
                <input name="allergyNotes" placeholder="Allergy notes" className="rounded-2xl border-slate-200" />
                <input name="dietaryNotes" placeholder="Dietary notes" className="rounded-2xl border-slate-200 md:col-span-2" />
                <SubmitButton label="Save child" pendingLabel="Saving..." />
              </form>
            </details>
          </Card>

          <Card className="space-y-4 xl:order-2">
            <h2 className="text-xl font-semibold">Upcoming week planner</h2>
            <p className="text-sm text-slate-600">
              Build one lunch schedule for the upcoming school week. Choose a saved child, add items day by day, then check out that week only.
            </p>
            <WeeklyPlanPlanner
              children={parent.children.map((child) => ({
                id: child.id,
                schoolId: child.schoolId,
                schoolName: child.school.name,
                studentName: child.studentName,
                grade: child.grade
              }))}
              menuItems={menuItems.map((item) => ({
                id: item.id,
                name: item.name,
                slug: item.slug,
                basePriceCents: item.basePriceCents,
                options: item.options.map((option) => ({
                  id: option.id,
                  name: option.name,
                  optionType: option.optionType,
                  priceDeltaCents: option.priceDeltaCents
                }))
              }))}
              weeklyAvailabilityBySchoolId={weeklyAvailabilityBySchoolId}
              existingPlans={parent.weeklyPlans.map((plan) => ({
                id: plan.id,
                parentChildId: plan.parentChildId,
                weekday: plan.weekday,
                menuItemId: plan.menuItemId,
                menuItemName: plan.menuItem.name,
                menuItemSlug: plan.menuItem.slug,
                choice: plan.choice,
                additions: plan.additions,
                removals: plan.removals,
                isActive: plan.isActive,
                sortOrder: plan.sortOrder
              }))}
            />
            <div className="hidden border-t border-slate-100 pt-4 lg:block">
              <WeeklyCheckoutButton />
            </div>
          </Card>
        </div>

        <Card className="space-y-4">
          <h2 className="text-xl font-semibold">Recent orders</h2>
          <div className="space-y-3">
            {orders.length ? (
              orders.map((order) => (
                <div key={order.id} className="flex flex-col gap-4 rounded-2xl border border-slate-100 p-4 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <p className="font-semibold text-ink">{order.student.studentName}</p>
                    <p>{order.items.map((item) => item.itemNameSnapshot).join(", ")}</p>
                    <p>
                      {order.school.name} | {formatInTimeZone(order.deliveryDate.deliveryDate, order.school.timezone, "EEE, MMM d")}
                    </p>
                    <p>Status: {order.status}</p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={`/order?reorder=${order.id}`}
                      className="inline-flex items-center justify-center rounded-full bg-brand-600 px-5 py-3 text-sm font-semibold text-white"
                    >
                      Reorder
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No orders yet. Once you place an order, it will show up here for easy reordering.</p>
            )}
          </div>
        </Card>

        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-brand-200 bg-white/95 px-4 py-3 shadow-soft backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-7xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">Upcoming Week</p>
              <p className="truncate text-sm text-slate-700">
                {activeWeeklyPlanCount
                  ? `${activeWeeklyPlanCount} planned item${activeWeeklyPlanCount === 1 ? "" : "s"} ready for checkout`
                  : "Add items to your week plan, then check out here"}
              </p>
            </div>
            <WeeklyCheckoutButton label="Checkout week" fullWidth={false} className="shrink-0" />
          </div>
        </div>
      </PageShell>
    </main>
  );
}
