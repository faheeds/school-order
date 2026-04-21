import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, SectionTitle } from "@/components/ui";
import { menuItemSchema, menuOptionSchema } from "@/lib/validation/order";
import { slugify } from "@/lib/utils";
import { SubmitButton } from "@/components/forms/submit-button";

export const dynamic = "force-dynamic";

function dollarsToCents(value: string) {
  const trimmed = value.trim().replace(/^\$/, "");
  if (!trimmed) return null;

  const amount = Number(trimmed);
  if (!Number.isFinite(amount) || amount < 0) return null;

  return Math.round(amount * 100);
}

function buildAdminMenuError(message: string) {
  return `/admin/menu?error=${encodeURIComponent(message)}`;
}

async function createMenuItem(formData: FormData) {
  "use server";

  const basePriceInput = String(formData.get("basePrice") ?? "");
  const basePriceCents = dollarsToCents(basePriceInput);
  if (basePriceCents === null) {
    redirect(buildAdminMenuError("Base price must be a dollar amount like 10.99"));
  }

  const parsed = menuItemSchema.safeParse({
    name: formData.get("name"),
    slug: slugify(String(formData.get("name") || "")),
    description: formData.get("description"),
    basePriceCents,
    isActive: formData.get("isActive") === "on"
  });

  if (!parsed.success) {
    redirect(buildAdminMenuError(parsed.error.issues[0]?.message ?? "Invalid menu item"));
  }

  try {
    await prisma.menuItem.create({ data: parsed.data });
  } catch {
    redirect(buildAdminMenuError("Could not save menu item. Check the fields and try again."));
  }

  revalidatePath("/admin/menu");
}

async function createMenuOption(formData: FormData) {
  "use server";

  const priceDeltaInput = String(formData.get("priceDelta") ?? "");
  const priceDeltaCents = priceDeltaInput.trim() ? dollarsToCents(priceDeltaInput) : 0;
  if (priceDeltaCents === null) {
    redirect(buildAdminMenuError("Price must be a dollar amount like 0.49"));
  }

  const parsed = menuOptionSchema.safeParse({
    menuItemId: formData.get("menuItemId"),
    name: formData.get("name"),
    optionType: formData.get("optionType"),
    priceDeltaCents,
    isDefault: false,
    sortOrder: formData.get("sortOrder")
  });

  if (!parsed.success) {
    redirect(buildAdminMenuError(parsed.error.issues[0]?.message ?? "Invalid menu option"));
  }

  try {
    await prisma.menuOption.create({ data: parsed.data });
  } catch {
    redirect(buildAdminMenuError("Could not save menu option. Check the fields and try again."));
  }

  revalidatePath("/admin/menu");
}

async function syncClassicCheeseburgerToppings() {
  "use server";

  const menuItem = await prisma.menuItem.findUnique({ where: { slug: "classic-cheeseburger" } });
  if (!menuItem) {
    redirect(buildAdminMenuError("Could not find Classic Cheeseburger"));
  }

  const namesToReplace = ["Lettuce", "Tomato", "Pickles", "Onions", "Jalapenos"];

  try {
    await prisma.menuItem.update({
      where: { id: menuItem.id },
      data: {
        description: "Signature Burgers & Sandwiches. Angus beef patty with cheddar. Add toppings if you'd like."
      }
    });

    await prisma.menuOption.deleteMany({
      where: {
        menuItemId: menuItem.id,
        name: { in: namesToReplace }
      }
    });

    await prisma.menuOption.createMany({
      data: [
        { menuItemId: menuItem.id, name: "Lettuce", optionType: "ADD_ON", priceDeltaCents: 49, sortOrder: 10, isDefault: false },
        { menuItemId: menuItem.id, name: "Tomato", optionType: "ADD_ON", priceDeltaCents: 49, sortOrder: 11, isDefault: false },
        { menuItemId: menuItem.id, name: "Pickles", optionType: "ADD_ON", priceDeltaCents: 49, sortOrder: 12, isDefault: false },
        { menuItemId: menuItem.id, name: "Onions", optionType: "ADD_ON", priceDeltaCents: 49, sortOrder: 13, isDefault: false },
        { menuItemId: menuItem.id, name: "Jalapenos", optionType: "ADD_ON", priceDeltaCents: 49, sortOrder: 14, isDefault: false }
      ]
    });
  } catch {
    redirect(buildAdminMenuError("Could not update Classic Cheeseburger options."));
  }

  revalidatePath("/admin/menu");
}

export default async function AdminMenuPage({
  searchParams
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const errorMessage = typeof params.error === "string" ? params.error : "";

  const items = await prisma.menuItem.findMany({
    include: { options: { orderBy: [{ optionType: "asc" }, { sortOrder: "asc" }] } },
    orderBy: { name: "asc" }
  });

  return (
    <div className="space-y-8">
      <SectionTitle eyebrow="Menu" title="Manage menu items, add-ons, and removable ingredients" />

      {errorMessage ? (
        <Card className="border border-rose-200 bg-rose-50 text-sm text-rose-800">{errorMessage}</Card>
      ) : null}

      <Card className="space-y-4">
        <h2 className="text-lg font-semibold">Add menu item</h2>
        <form action={createMenuItem} className="grid gap-4 md:grid-cols-4">
          <input name="name" placeholder="Item name" className="rounded-2xl border-slate-200" required />
          <input name="description" placeholder="Description" className="rounded-2xl border-slate-200" />
          <input
            type="number"
            step="0.01"
            min="0"
            name="basePrice"
            placeholder="Base price (USD)"
            defaultValue="0.00"
            className="rounded-2xl border-slate-200"
            required
          />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isActive" defaultChecked /> Active
          </label>
          <SubmitButton label="Create item" pendingLabel="Saving..." />
        </form>
        <p className="text-xs text-slate-500">Tip: enter prices like 10.99 (not cents).</p>
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
          <input
            type="number"
            step="0.01"
            min="0"
            name="priceDelta"
            placeholder="Price (USD)"
            defaultValue="0.00"
            className="rounded-2xl border-slate-200"
            required
          />
          <input name="sortOrder" defaultValue="0" className="rounded-2xl border-slate-200" required />
          <SubmitButton label="Add option" pendingLabel="Saving..." />
        </form>
        <p className="text-xs text-slate-500">Example: 0.49 will charge $0.49.</p>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-lg font-semibold">Quick fixes</h2>
        <p className="text-sm text-slate-600">
          Classic Cheeseburger should not include lettuce, tomato, pickles, onions, or jalapenos by default. This updates them as $0.49 add-ons.
        </p>
        <form action={syncClassicCheeseburgerToppings}>
          <SubmitButton label="Update Classic Cheeseburger toppings" pendingLabel="Updating..." />
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
