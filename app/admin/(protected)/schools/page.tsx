import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { ALLOWED_SCHOOL_SLUGS } from "@/lib/school-config";
import { Card, SectionTitle } from "@/components/ui";
import { schoolSchema } from "@/lib/validation/order";
import { slugify } from "@/lib/utils";
import { SubmitButton } from "@/components/forms/submit-button";

export const dynamic = "force-dynamic";

async function createSchool(formData: FormData) {
  "use server";
  const parsed = schoolSchema.parse({
    name: formData.get("name"),
    slug: slugify(String(formData.get("name") || "")),
    timezone: formData.get("timezone"),
    defaultCutoffHour: formData.get("defaultCutoffHour"),
    defaultCutoffMinute: formData.get("defaultCutoffMinute"),
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
        <form action={createSchool} className="grid gap-4 md:grid-cols-4">
          <input name="name" placeholder="School name" className="rounded-2xl border-slate-200" required />
          <input name="timezone" defaultValue="America/Los_Angeles" className="rounded-2xl border-slate-200" required />
          <input name="defaultCutoffHour" defaultValue="17" className="rounded-2xl border-slate-200" required />
          <input name="defaultCutoffMinute" defaultValue="0" className="rounded-2xl border-slate-200" required />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="collectTeacher" defaultChecked /> Collect teacher</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="collectClassroom" defaultChecked /> Collect classroom</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isActive" defaultChecked /> Active</label>
          <SubmitButton label="Add school" pendingLabel="Saving..." />
        </form>
      </Card>
      <div className="grid gap-4">
        {schools.map((school) => (
          <Card key={school.id} className="text-sm text-slate-600">
            <p className="font-semibold text-ink">{school.name}</p>
            <p>Timezone: {school.timezone}</p>
            <p>Default cutoff: {school.defaultCutoffHour}:{String(school.defaultCutoffMinute).padStart(2, "0")}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
