import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { Card, PageShell, SectionTitle } from "@/components/ui";
import { SubmitButton } from "@/components/forms/submit-button";
import { WeeklyCheckoutButton } from "@/components/account/weekly-checkout-button";
import { prisma } from "@/lib/db";
import { signOut } from "@/lib/auth";
import { requireParent } from "@/lib/parent-auth";
import { ALLOWED_SCHOOL_SLUGS } from "@/lib/school-config";

const weekdays = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" }
];

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

  async function saveWeeklyPlan(formData: FormData) {
    "use server";
    const session = await requireParent();
    const parentUserId = session.user?.parentUserId;
    if (!parentUserId) {
      redirect("/account/sign-in");
    }
    await prisma.weeklyLunchPlan.upsert({
      where: {
        parentChildId_weekday: {
          parentChildId: String(formData.get("parentChildId")),
          weekday: Number(formData.get("weekday"))
        }
      },
      update: {
        parentChildId: String(formData.get("parentChildId")),
        schoolId: String(formData.get("schoolId")),
        weekday: Number(formData.get("weekday")),
        menuItemId: String(formData.get("menuItemId")),
        choice: String(formData.get("choice") || "") || null,
        additions: [],
        removals: [],
        isActive: formData.get("isActive") === "on"
      },
      create: {
        parentUserId,
        parentChildId: String(formData.get("parentChildId")),
        schoolId: String(formData.get("schoolId")),
        weekday: Number(formData.get("weekday")),
        menuItemId: String(formData.get("menuItemId")),
        choice: String(formData.get("choice") || "") || null,
        additions: [],
        removals: [],
        isActive: formData.get("isActive") === "on"
      }
    });
    revalidatePath("/account");
    redirect("/account");
  }

  const [parent, schools, menuItems, orders] = await Promise.all([
    prisma.parentUser.findUnique({
      where: { id: parentUserId },
      include: {
        children: {
          include: { school: true },
          orderBy: { studentName: "asc" }
        },
        weeklyPlans: {
          include: {
            parentChild: true,
            menuItem: true,
            school: true
          },
          orderBy: [{ weekday: "asc" }, { createdAt: "asc" }]
        }
      }
    }),
    prisma.school.findMany({
      where: { isActive: true, slug: { in: [...ALLOWED_SCHOOL_SLUGS] } },
      orderBy: { name: "asc" }
    }),
    prisma.menuItem.findMany({
      where: { isActive: true },
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

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#f5fbf8_0%,_#fffdfa_100%)]">
      <PageShell className="space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <SectionTitle
            eyebrow="Parent Account"
            title={`Welcome${parent.name ? `, ${parent.name}` : ""}`}
            description="Save your children, keep a weekly lunch plan, and reorder past lunches with fewer clicks."
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
          <Card className="space-y-4">
            <h2 className="text-xl font-semibold">Saved children</h2>
            <div className="space-y-3">
              {parent.children.length ? (
                parent.children.map((child) => (
                  <div key={child.id} className="rounded-2xl border border-slate-100 p-4 text-sm text-slate-600">
                    <p className="font-semibold text-ink">{child.studentName}</p>
                    <p>{child.school.name} | Grade {child.grade}</p>
                    <p>Allergy notes: {child.allergyNotes || "None"}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No saved children yet.</p>
              )}
            </div>

            <div className="border-t border-slate-100 pt-4">
              <h3 className="text-lg font-semibold">Add a child</h3>
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
            </div>
          </Card>

          <Card className="space-y-4">
            <h2 className="text-xl font-semibold">Weekly lunch plan</h2>
            <p className="text-sm text-slate-600">Build reusable weekday defaults for each child. You can use these as your family’s standing lunch plan.</p>
            <WeeklyCheckoutButton />
            <form action={saveWeeklyPlan} className="grid gap-4 md:grid-cols-2">
              <select name="parentChildId" className="rounded-2xl border-slate-200" required>
                <option value="">Select child</option>
                {parent.children.map((child) => (
                  <option key={child.id} value={child.id}>
                    {child.studentName}
                  </option>
                ))}
              </select>
              <select name="schoolId" className="rounded-2xl border-slate-200" required>
                <option value="">Select school</option>
                {schools.map((school) => (
                  <option key={school.id} value={school.id}>
                    {school.name}
                  </option>
                ))}
              </select>
              <select name="weekday" className="rounded-2xl border-slate-200" required>
                <option value="">Select weekday</option>
                {weekdays.map((weekday) => (
                  <option key={weekday.value} value={weekday.value}>
                    {weekday.label}
                  </option>
                ))}
              </select>
              <select name="menuItemId" className="rounded-2xl border-slate-200" required>
                <option value="">Select menu item</option>
                {menuItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              <input name="choice" placeholder="Required choice if needed" className="rounded-2xl border-slate-200 md:col-span-2" />
              <label className="flex items-center gap-2 text-sm text-slate-600 md:col-span-2">
                <input type="checkbox" name="isActive" defaultChecked />
                <span>Active weekly plan</span>
              </label>
              <SubmitButton label="Save weekly plan" pendingLabel="Saving..." />
            </form>

            <div className="space-y-3 border-t border-slate-100 pt-4">
              {parent.weeklyPlans.length ? (
                parent.weeklyPlans.map((plan) => (
                  <div key={plan.id} className="rounded-2xl border border-slate-100 p-4 text-sm text-slate-600">
                    <p className="font-semibold text-ink">
                      {weekdays.find((weekday) => weekday.value === plan.weekday)?.label}: {plan.parentChild.studentName}
                    </p>
                    <p>{plan.school.name}</p>
                    <p>{plan.menuItem.name}</p>
                    <p>Choice: {plan.choice || "None"}</p>
                    <p>Status: {plan.isActive ? "Active" : "Inactive"}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No weekly plans saved yet.</p>
              )}
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
      </PageShell>
    </main>
  );
}
