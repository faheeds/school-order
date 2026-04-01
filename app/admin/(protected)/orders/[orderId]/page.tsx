import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Card, SectionTitle } from "@/components/ui";
import { prisma } from "@/lib/db";
import { updateOrderBeforeCutoff } from "@/lib/orders";
import { SubmitButton } from "@/components/forms/submit-button";

export const dynamic = "force-dynamic";

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      school: true,
      deliveryDate: true,
      student: true,
      items: {
        include: {
          menuItem: {
            include: { options: { orderBy: { sortOrder: "asc" } } }
          }
        }
      }
    }
  });

  if (!order) {
    notFound();
  }

  const item = order.items[0];

  async function saveOrder(formData: FormData) {
    "use server";
    await updateOrderBeforeCutoff({
      orderId,
      teacherName: String(formData.get("teacherName") || ""),
      classroom: String(formData.get("classroom") || ""),
      additions: formData.getAll("additions").map(String),
      removals: formData.getAll("removals").map(String),
      allergyNotes: String(formData.get("allergyNotes") || ""),
      dietaryNotes: String(formData.get("dietaryNotes") || ""),
      specialInstructions: String(formData.get("specialInstructions") || "")
    });
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath("/admin/orders");
    redirect("/admin/orders");
  }

  return (
    <div className="space-y-8">
      <SectionTitle
        eyebrow="Edit Order"
        title={`Adjust ${order.student.studentName}'s lunch order`}
        description="Order edits remain available until the delivery cutoff. Label generation always uses the latest saved order data."
      />
      <Card className="space-y-6">
        <Link href="/admin/orders" className="text-sm font-medium text-brand-700">
          Back to orders
        </Link>
        <form action={saveOrder} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium">Teacher</span>
              <input name="teacherName" defaultValue={order.student.teacherName ?? ""} className="w-full rounded-2xl border-slate-200" />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Classroom</span>
              <input name="classroom" defaultValue={order.student.classroom ?? ""} className="w-full rounded-2xl border-slate-200" />
            </label>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold">Additions</legend>
              {item.menuItem.options
                .filter((option) => option.optionType === "ADD_ON")
                .map((option) => (
                  <label key={option.id} className="flex items-center gap-3 text-sm">
                    <input type="checkbox" name="additions" value={option.name} defaultChecked={item.additions.includes(option.name)} />
                    {option.name}
                  </label>
                ))}
            </fieldset>
            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold">Removals</legend>
              {item.menuItem.options
                .filter((option) => option.optionType === "REMOVAL")
                .map((option) => (
                  <label key={option.id} className="flex items-center gap-3 text-sm">
                    <input type="checkbox" name="removals" value={option.name} defaultChecked={item.removals.includes(option.name)} />
                    {option.name}
                  </label>
                ))}
            </fieldset>
          </div>

          <div className="grid gap-4">
            <label className="space-y-2">
              <span className="text-sm font-medium">Allergy notes</span>
              <textarea name="allergyNotes" rows={3} defaultValue={item.allergyNotes ?? ""} className="w-full rounded-2xl border-slate-200" />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Dietary notes</span>
              <textarea name="dietaryNotes" rows={3} defaultValue={item.dietaryNotes ?? ""} className="w-full rounded-2xl border-slate-200" />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Special instructions</span>
              <textarea
                name="specialInstructions"
                rows={3}
                defaultValue={order.specialInstructions ?? ""}
                className="w-full rounded-2xl border-slate-200"
              />
            </label>
          </div>
          <SubmitButton label="Save order changes" pendingLabel="Saving..." />
        </form>
      </Card>
    </div>
  );
}
