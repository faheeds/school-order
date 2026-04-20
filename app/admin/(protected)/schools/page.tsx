import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { ALLOWED_SCHOOL_SLUGS } from "@/lib/school-config";
import { Card, SectionTitle } from "@/components/ui";
import { schoolSchema } from "@/lib/validation/order";
import { slugify } from "@/lib/utils";
import { SubmitButton } from "@/components/forms/submit-button";

export const dynamic = "force-dynamic";

function formatCutoffTime(hour: number, minute: number) {
  const suffix = hour >= 12 ? "PM" : "AM";
  const hour12 = ((hour + 11) % 12) + 1;
  return `${hour12}:${String(minute).padStart(2, "0")} ${suffix}`;
}

async function createSchool(formData: FormData) {
  "use server";

  const cutoffTime = String(formData.get("defaultCutoffTime") ?? "");
  const [cutoffHourRaw, cutoffMinuteRaw] = cutoffTime.split(":");

  const parsed = schoolSchema.parse({
    name: formData.get("name"),
    slug: slugify(String(formData.get("name") || "")),
    timezone: formData.get("timezone"),
    defaultCutoffHour: cutoffTime ? Number(cutoffHourRaw) : formData.get("defaultCutoffHour"),
    defaultCutoffMinute: cutoffTime ? Number(cutoffMinuteRaw) : formData.get("defaultCutoffMinute"),
    collectTeacher: formData.get("collectTeacher") === "on",
    collectClassroom: formData.get("collectClassroom") === "on",
    isActive: formData.get("isActive") === "on"
  });

  await prisma.school.create({ data: parsed });
  revalidatePath("/admin/schools");
}

export default async function AdminSchoolsPage() {
  const schools = await prisma.school.findMany({
    where: { isActive: true, slug: { in: [...ALLOWED_SCHOOL_SLUGS] } },
    orderBy: { name: "asc" }
  });

  return (
    <div className="space-y-8">
      <SectionTitle eyebrow="Schools" title="Manage schools and cutoff defaults" />
      <Card>
        <form
          action={createSchool}
          className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
        >
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">School name</span>
            <input name="name" placeholder="Medina Academy Redmond" className="w-full rounded-2xl border-slate-200" required />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Timezone</span>
            <input
              name="timezone"
              defaultValue="America/Los_Angeles"
              placeholder="America/Los_Angeles"
              className="w-full rounded-2xl border-slate-200"
              required
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Default cutoff time</span>
            <input
              type="time"
              step={60}
              name="defaultCutoffTime"
              defaultValue="17:00"
              className="w-full rounded-2xl border-slate-200 bg-white"
              required
            />
            <p className="text-xs text-slate-500">Ordering closes the day before delivery, in this school&apos;s timezone.</p>
          </label>

          <div className="flex flex-col gap-3 lg:justify-end">
            <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
              <input type="checkbox" name="collectTeacher" defaultChecked />
              Collect teacher
            </label>
            <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
              <input type="checkbox" name="collectClassroom" defaultChecked />
              Collect classroom
            </label>
            <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
              <input type="checkbox" name="isActive" defaultChecked />
              Active
            </label>
            <SubmitButton label="Add school" pendingLabel="Saving..." />
          </div>
        </form>
      </Card>

      <div className="grid gap-4">
        {schools.map((school) => (
          <Card key={school.id} className="text-sm text-slate-600">
            <p className="font-semibold text-ink">{school.name}</p>
            <p>Timezone: {school.timezone}</p>
            <p>
              Default cutoff: {formatCutoffTime(school.defaultCutoffHour, school.defaultCutoffMinute)} (day before delivery)
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}
