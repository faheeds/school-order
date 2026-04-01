import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { Card, SectionTitle } from "@/components/ui";
import { menuItemSchema, menuOptionSchema } from "@/lib/validation/order";
import { slugify } from "@/lib/utils";
import { SubmitButton } from "@/components/forms/submit-button";

export const dynamic = "force-dynamic";

async function createMenuItem(formData: FormData) {
  "use server";
  const parsed = menuItemSchema.parse({
    name: formData.get("name"),
    slug: slugify(String(formData.get("name") || "")),
    description: formData.get("description"),
    basePriceCents: formData.get("basePriceCents"),
    isActive: formData.get("isActive") === "on"
  });
  await prisma.menuItem.create({ data: parsed });
  revalidatePath("/admin/menu");
}

async function createMenuOption(formData: FormData) {
  "use server";
  const parsed = menuOptionSchema.parse({
    menuItemId: formData.get("menuItemId"),
    name: formData.get("name"),
    optionType: formData.get("optionType"),
    priceDeltaCents: formData.get("priceDeltaCents"),
    isDefault: false,
    sortOrder: formData.get("sortOrder")
  });
  await prisma.menuOption.create({ data: parsed });
  revalidatePath("/admin/menu");
}

export default async function AdminMenuPage() {
  const items = await prisma.menuItem.findMany({
    include: { options: { orderBy: [{ optionType: "asc" }, { sortOrder: "asc" }] } },
    orderBy: { name: "asc" }
  });

  return (
    <div className="space-y-8">
      <SectionTitle eyebrow="Menu" title="Manage menu items, add-ons, and removable ingredients" />
      <Card className="space-y-4">
        <h2 className="text-lg font-semibold">Add menu item</h2>
        <form action={createMenuItem} className="grid gap-4 md:grid-cols-4">
          <input name="name" placeholder="Item name" className="rounded-2xl border-slate-200" required />
          <input name="description" placeholder="Description" className="rounded-2xl border-slate-200" />
          <input name="basePriceCents" placeholder="Base price cents" className="rounded-2xl border-slate-200" required />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isActive" defaultChecked /> Active</label>
          <SubmitButton label="Create item" pendingLabel="Saving..." />
        </form>
      </Card>
      <Card className="space-y-4">
        <h2 className="text-lg font-semibold">Add menu option</h2>
        <form action={createMenuOption} className="grid gap-4 md:grid-cols-5">
          <select name="menuItemId" className="rounded-2xl border-slate-200">
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <input name="name" placeholder="Option name" className="rounded-2xl border-slate-200" required />
          <select name="optionType" className="rounded-2xl border-slate-200">
            <option value="ADD_ON">Add-on</option>
            <option value="REMOVAL">Removal</option>
          </select>
          <input name="priceDeltaCents" defaultValue="0" className="rounded-2xl border-slate-200" required />
          <input name="sortOrder" defaultValue="0" className="rounded-2xl border-slate-200" required />
          <SubmitButton label="Add option" pendingLabel="Saving..." />
        </form>
      </Card>
      <div className="grid gap-4">
        {items.map((item) => (
          <Card key={item.id} className="space-y-3 text-sm text-slate-600">
            <div>
              <p className="font-semibold text-ink">{item.name}</p>
              <p>{item.description || "No description"}</p>
            </div>
            <p>Base price: ${(item.basePriceCents / 100).toFixed(2)}</p>
            <div className="flex flex-wrap gap-2">
              {item.options.map((option) => (
                <span key={option.id} className="rounded-full bg-brand-50 px-3 py-1">
                  {option.optionType === "ADD_ON" ? "Add" : "No"}: {option.name}
                  {option.priceDeltaCents ? ` (+$${(option.priceDeltaCents / 100).toFixed(2)})` : ""}
                </span>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
