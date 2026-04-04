"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { getRequiredChoicesForMenuItem } from "@/lib/menu-config";
import { cn } from "@/lib/utils";

type DeliveryDate = {
  id: string;
  schoolId: string;
  deliveryDate: string;
  cutoffAt: string;
  orderingOpen: boolean;
  school: {
    id: string;
    name: string;
    timezone: string;
  };
};

type MenuOption = {
  id: string;
  name: string;
  optionType: "ADD_ON" | "REMOVAL";
  priceDeltaCents: number;
};

type MenuItem = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  basePriceCents: number;
  options: MenuOption[];
};

type CartItem = {
  id: string;
  menuItemId: string;
  itemName: string;
  choice?: string;
  additions: string[];
  removals: string[];
  lineTotalCents: number;
};

type OrderFormProps = {
  deliveryDates: DeliveryDate[];
  menuItemsByDeliveryDate: Record<string, MenuItem[]>;
  savedChildren?: {
    id: string;
    schoolId: string;
    studentName: string;
    grade: string;
    allergyNotes: string;
    dietaryNotes: string;
  }[];
  initialParentProfile?: {
    parentName: string;
    parentEmail: string;
    parentChildId: string;
    studentName: string;
    grade: string;
    allergyNotes: string;
  };
  initialSchoolId?: string;
  initialDeliveryDateId?: string;
  initialCartItems?: CartItem[];
};

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

const CATEGORY_ORDER = [
  "Signature Burgers & Sandwiches",
  "Salads with Protein",
  "Comfort Favorites",
  "Sides & Snacks"
];

function getMenuCategory(item: MenuItem) {
  const prefix = item.description?.split(".")[0]?.trim();
  if (prefix && CATEGORY_ORDER.includes(prefix)) {
    return prefix;
  }

  if (item.name.includes("Burger") || item.name.includes("Sandwich")) return "Signature Burgers & Sandwiches";
  if (item.name.includes("Salad")) return "Salads with Protein";
  if (item.name.includes("Mac") || item.name.includes("Quesadilla")) return "Comfort Favorites";
  return "Sides & Snacks";
}

function getMenuSummary(item: MenuItem) {
  const parts = item.description?.split(". ");
  if (!parts?.length) return "";
  if (CATEGORY_ORDER.includes(parts[0].trim())) {
    return parts.slice(1).join(". ").trim();
  }
  return item.description ?? "";
}

export function OrderForm({
  deliveryDates,
  menuItemsByDeliveryDate,
  savedChildren = [],
  initialParentProfile,
  initialSchoolId,
  initialDeliveryDateId,
  initialCartItems = []
}: OrderFormProps) {
  const defaultSchoolId = initialSchoolId || deliveryDates[0]?.school.id || "";
  const defaultDeliveryDateId =
    initialDeliveryDateId ||
    deliveryDates.find((item) => item.school.id === defaultSchoolId)?.id ||
    deliveryDates[0]?.id ||
    "";
  const [selectedSchoolId, setSelectedSchoolId] = useState(defaultSchoolId);
  const [selectedDeliveryDateId, setSelectedDeliveryDateId] = useState(defaultDeliveryDateId);
  const [selectedMenuItemId, setSelectedMenuItemId] = useState("");
  const [selectedChoice, setSelectedChoice] = useState("");
  const [selectedAdditions, setSelectedAdditions] = useState<string[]>([]);
  const [selectedRemovals, setSelectedRemovals] = useState<string[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>(initialCartItems);
  const [error, setError] = useState("");
  const customizeSectionRef = useRef<HTMLDivElement | null>(null);
  const [selectedParentChildId, setSelectedParentChildId] = useState(initialParentProfile?.parentChildId ?? savedChildren[0]?.id ?? "");
  const [parentName, setParentName] = useState(initialParentProfile?.parentName ?? "");
  const [parentEmail, setParentEmail] = useState(initialParentProfile?.parentEmail ?? "");
  const [studentName, setStudentName] = useState(initialParentProfile?.studentName ?? "");
  const [grade, setGrade] = useState(initialParentProfile?.grade ?? "");
  const [allergyNotes, setAllergyNotes] = useState(initialParentProfile?.allergyNotes ?? "");
  const schools = useMemo(
    () =>
      deliveryDates.reduce<DeliveryDate["school"][]>((acc, item) => {
        if (!acc.find((school) => school.id === item.school.id)) {
          acc.push(item.school);
        }
        return acc;
      }, []),
    [deliveryDates]
  );
  const schoolDeliveryDates = useMemo(
    () => deliveryDates.filter((item) => item.school.id === selectedSchoolId),
    [deliveryDates, selectedSchoolId]
  );
  const selectedDelivery = deliveryDates.find((item) => item.id === selectedDeliveryDateId);
  const menuItems = menuItemsByDeliveryDate[selectedDeliveryDateId] ?? [];
  const selectedMenuItem = menuItems.find((item) => item.id === selectedMenuItemId);
  const groupedMenuItems = useMemo(() => {
    const groups = menuItems.reduce<Record<string, MenuItem[]>>((acc, item) => {
      const category = getMenuCategory(item);
      acc[category] = acc[category] ?? [];
      acc[category].push(item);
      return acc;
    }, {});

    return CATEGORY_ORDER.reduce<Record<string, MenuItem[]>>((ordered, category) => {
      if (groups[category]?.length) {
        ordered[category] = groups[category];
      }
      return ordered;
    }, {});
  }, [menuItems]);

  const selectedItemTotalCents = useMemo(() => {
    if (!selectedMenuItem) return 0;
    const additionsCost = selectedMenuItem.options
      .filter((option) => option.optionType === "ADD_ON" && selectedAdditions.includes(option.name))
      .reduce((sum, option) => sum + option.priceDeltaCents, 0);
    return selectedMenuItem.basePriceCents + additionsCost;
  }, [selectedAdditions, selectedMenuItem]);

  const totalCents = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.lineTotalCents, 0),
    [cartItems]
  );
  const requiredChoices = selectedMenuItem ? getRequiredChoicesForMenuItem(selectedMenuItem.slug) : [];

  useEffect(() => {
    if (!selectedParentChildId) return;
    const child = savedChildren.find((entry) => entry.id === selectedParentChildId);
    if (!child) return;
    setSelectedSchoolId(child.schoolId);
    setSelectedDeliveryDateId((current) => {
      const matchingCurrent = deliveryDates.find((date) => date.id === current && date.schoolId === child.schoolId);
      return matchingCurrent?.id ?? deliveryDates.find((date) => date.schoolId === child.schoolId)?.id ?? current;
    });
    setStudentName(child.studentName);
    setGrade(child.grade);
    setAllergyNotes(child.allergyNotes);
  }, [deliveryDates, savedChildren, selectedParentChildId]);

  function toggleSelection(value: string, current: string[], setter: (items: string[]) => void) {
    setter(current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  }

  function jumpToCustomize() {
    customizeSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function addSelectedItemToCart() {
    if (!selectedMenuItem) {
      setError("Select an item before adding it to the cart.");
      return;
    }
    if (requiredChoices.length && !selectedChoice) {
      setError(`Choose a required option for ${selectedMenuItem.name} before adding it to the cart.`);
      return;
    }

    setCartItems((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        menuItemId: selectedMenuItem.id,
        itemName: selectedMenuItem.name,
        choice: selectedChoice || undefined,
        additions: selectedAdditions,
        removals: selectedRemovals,
        lineTotalCents: selectedItemTotalCents
      }
    ]);
    setSelectedChoice("");
    setSelectedAdditions([]);
    setSelectedRemovals([]);
    setSelectedMenuItemId("");
    setError("");
  }

  function removeCartItem(id: string) {
    setCartItems((current) => current.filter((item) => item.id !== id));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!cartItems.length) {
      setError("Add at least one item to the cart before continuing to payment.");
      return;
    }
    const form = event.currentTarget;
    const formData = new FormData(form);

    const payload = {
      parentName,
      parentEmail,
      schoolId: selectedDelivery?.school.id,
      deliveryDateId: selectedDeliveryDateId,
      parentChildId: selectedParentChildId || undefined,
      studentName,
      grade,
      cartItems: cartItems.map((item) => ({
        menuItemId: item.menuItemId,
        choice: item.choice,
        additions: item.additions,
        removals: item.removals
      })),
      allergyNotes,
      dietaryNotes: null,
      specialInstructions: null
    };

    const response = await fetch("/api/checkout/create-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "Unable to start checkout.");
      return;
    }

    window.location.href = data.checkoutUrl;
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:gap-8">
      <div className="space-y-5 rounded-3xl border border-brand-100 bg-white p-4 shadow-soft sm:p-6">
        <div className="rounded-3xl bg-brand-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">Step 1</p>
          <h2 className="mt-1 text-lg font-semibold">Choose school, delivery date, and student details</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium">School</span>
              <select
                name="schoolId"
                className="w-full rounded-2xl border-slate-200"
                value={selectedSchoolId}
                onChange={(event) => {
                  const nextSchoolId = event.target.value;
                  const nextDates = deliveryDates.filter((item) => item.school.id === nextSchoolId);
                  setSelectedSchoolId(nextSchoolId);
                  setSelectedDeliveryDateId(nextDates[0]?.id ?? "");
                  setSelectedMenuItemId("");
                  setSelectedChoice("");
                  setSelectedAdditions([]);
                  setSelectedRemovals([]);
                  setCartItems([]);
                }}
              >
                {schools.map((school) => (
                  <option key={school.id} value={school.id}>
                    {school.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Available delivery date</span>
              <select
                name="deliveryDateId"
                className="w-full rounded-2xl border-slate-200"
                value={selectedDeliveryDateId}
                onChange={(event) => {
                  setSelectedDeliveryDateId(event.target.value);
                  setSelectedMenuItemId("");
                  setSelectedChoice("");
                  setSelectedAdditions([]);
                  setSelectedRemovals([]);
                  setCartItems([]);
                }}
              >
                {schoolDeliveryDates.map((date) => (
                  <option key={date.id} value={date.id}>
                    {formatInTimeZone(date.deliveryDate, date.school.timezone, "EEE, MMM d")} (cutoff{" "}
                    {formatInTimeZone(date.cutoffAt, date.school.timezone, "MMM d h:mm a")})
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Parent name</span>
              <input name="parentName" required className="w-full rounded-2xl border-slate-200" value={parentName} onChange={(event) => setParentName(event.target.value)} />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Parent email</span>
              <input type="email" name="parentEmail" required className="w-full rounded-2xl border-slate-200" value={parentEmail} onChange={(event) => setParentEmail(event.target.value)} />
            </label>
            {savedChildren.length ? (
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium">Saved child</span>
                <select
                  name="parentChildId"
                  className="w-full rounded-2xl border-slate-200"
                  value={selectedParentChildId}
                  onChange={(event) => setSelectedParentChildId(event.target.value)}
                >
                  <option value="">Use manual entry</option>
                  {savedChildren.map((child) => (
                    <option key={child.id} value={child.id}>
                      {child.studentName}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className="space-y-2">
              <span className="text-sm font-medium">Student name</span>
              <input name="studentName" required className="w-full rounded-2xl border-slate-200" value={studentName} onChange={(event) => setStudentName(event.target.value)} />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Grade</span>
              <input name="grade" required className="w-full rounded-2xl border-slate-200" value={grade} onChange={(event) => setGrade(event.target.value)} />
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium">Allergy notes</span>
              <textarea name="allergyNotes" rows={3} className="w-full rounded-2xl border-slate-200" value={allergyNotes} onChange={(event) => setAllergyNotes(event.target.value)} />
            </label>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-100 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">Step 2</p>
          <h2 className="mt-1 text-lg font-semibold">Pick a lunch item</h2>
          <p className="mt-1 text-sm text-slate-600">Select an item and its customization options will appear immediately below. Add it to the cart, then repeat for more items.</p>
          <div className="mt-4 space-y-5">
            {Object.entries(groupedMenuItems).map(([category, items]) => (
              <div key={category} className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">{category}</h3>
                <div className="grid gap-3 xl:grid-cols-2">
                  {items.map((item) => {
                    const isSelected = selectedMenuItemId === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setSelectedMenuItemId(item.id);
                          setSelectedChoice("");
                          setSelectedAdditions([]);
                          setSelectedRemovals([]);
                        }}
                        className={cn(
                          "rounded-2xl border p-4 text-left transition",
                          isSelected
                            ? "border-brand-500 bg-brand-50 shadow-sm"
                            : "border-slate-200 bg-white hover:border-brand-200 hover:bg-slate-50"
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-ink">{item.name}</p>
                            <p className="mt-1 text-sm text-slate-600">{getMenuSummary(item)}</p>
                          </div>
                          <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-brand-700 shadow-sm">
                            {formatCurrency(item.basePriceCents)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {selectedMenuItem ? (
          <div ref={customizeSectionRef} className="rounded-3xl border border-slate-100 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">Step 3</p>
            <h2 className="mt-1 text-lg font-semibold">Customize {selectedMenuItem.name}</h2>
            <p className="mt-1 text-sm text-slate-600">Choose add-ons or removals now. The quick-add bar below stays visible while you scroll.</p>
            {requiredChoices.length ? (
              <div className="mt-4 rounded-2xl border border-brand-100 bg-brand-50 p-4">
                <p className="text-sm font-semibold text-ink">Required: choose one option</p>
                <div className="mt-3 grid gap-2">
                  {requiredChoices.map((choice) => (
                    <label key={choice} className="flex items-center gap-3 rounded-2xl bg-white px-3 py-3 text-sm">
                      <input
                        type="radio"
                        name="gourmetChoice"
                        checked={selectedChoice === choice}
                        onChange={() => setSelectedChoice(choice)}
                      />
                      <span>{choice}</span>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="mt-4 grid gap-6 lg:grid-cols-2">
            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold">Additions</legend>
              {selectedMenuItem.options
                .filter(
                  (option) =>
                    option.optionType === "ADD_ON" &&
                    !requiredChoices.includes(option.name)
                )
                .map((option) => (
                  <label key={option.id} className="flex items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedAdditions.includes(option.name)}
                      onChange={() => toggleSelection(option.name, selectedAdditions, setSelectedAdditions)}
                      className="rounded border-slate-300"
                    />
                    <span>
                      {option.name}
                      {option.priceDeltaCents ? ` (+${formatCurrency(option.priceDeltaCents)})` : ""}
                    </span>
                  </label>
                ))}
            </fieldset>

            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold">Removals</legend>
              {selectedMenuItem.options
                .filter((option) => option.optionType === "REMOVAL")
                .map((option) => (
                  <label key={option.id} className="flex items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedRemovals.includes(option.name)}
                      onChange={() => toggleSelection(option.name, selectedRemovals, setSelectedRemovals)}
                      className="rounded border-slate-300"
                    />
                    <span>{option.name}</span>
                  </label>
                ))}
            </fieldset>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={addSelectedItemToCart}
                className="rounded-full bg-brand-600 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-700"
              >
                Add item to cart
              </button>
              <p className="text-sm text-slate-600">This item total: {formatCurrency(selectedItemTotalCents)}</p>
            </div>
          </div>
        ) : null}

        {error ? <p className="rounded-2xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}

        {selectedMenuItem ? (
          <div className="sticky bottom-24 z-10 rounded-3xl border border-brand-200 bg-white/95 p-4 shadow-soft backdrop-blur md:bottom-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">Quick Add</p>
                <p className="font-semibold text-ink">{selectedMenuItem.name}</p>
                <p className="text-sm text-slate-600">
                  {selectedChoice ? `Choice: ${selectedChoice} · ` : ""}
                  {selectedAdditions.length ? `Add: ${selectedAdditions.join(", ")}` : "No add-ons selected"}
                  {" · "}
                  {selectedRemovals.length ? `No: ${selectedRemovals.join(", ")}` : "No removals selected"}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 md:justify-start">
                <p className="text-sm font-semibold text-ink">{formatCurrency(selectedItemTotalCents)}</p>
                <button
                  type="button"
                  onClick={jumpToCustomize}
                  className="rounded-full border border-slate-200 px-4 py-3 text-sm font-semibold text-ink hover:border-brand-300 hover:text-brand-700"
                >
                  Customize
                </button>
                <button
                  type="button"
                  onClick={addSelectedItemToCart}
                  className="rounded-full bg-brand-600 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-700"
                >
                  Add to cart
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <aside className="hidden rounded-3xl border border-brand-100 bg-brand-900 p-6 text-white shadow-soft lg:sticky lg:top-6 lg:block lg:self-start">
        <h2 className="text-xl font-semibold">Cart summary</h2>
        <div className="mt-6 space-y-3 text-sm text-brand-100">
          {cartItems.length ? (
            cartItems.map((item) => (
              <div key={item.id} className="rounded-2xl bg-white/10 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{item.itemName}</p>
                    {item.choice ? <p>Choice: {item.choice}</p> : null}
                    <p>Add: {item.additions.length ? item.additions.join(", ") : "None"}</p>
                    <p>No: {item.removals.length ? item.removals.join(", ") : "None"}</p>
                  </div>
                  <button type="button" onClick={() => removeCartItem(item.id)} className="text-xs text-brand-100 underline">
                    Remove
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p>No items in cart yet.</p>
          )}
          {selectedDelivery ? (
            <>
              <p>School: {selectedDelivery.school.name}</p>
              <p>
                Delivery: {formatInTimeZone(selectedDelivery.deliveryDate, selectedDelivery.school.timezone, "EEEE, MMMM d")}
              </p>
              <p>Ordering closes: {formatInTimeZone(selectedDelivery.cutoffAt, selectedDelivery.school.timezone, "MMM d h:mm a zzz")}</p>
            </>
          ) : null}
        </div>
        <div className="mt-8 rounded-3xl bg-white/10 p-4">
          <p className="text-sm uppercase tracking-[0.2em] text-brand-100">Cart total</p>
          <p className="mt-2 text-3xl font-semibold">{formatCurrency(totalCents)}</p>
          <p className="mt-2 text-sm text-brand-100">Stripe checkout will include every item currently in the cart.</p>
          <button
            type="submit"
            className="mt-4 w-full rounded-full bg-white px-6 py-3 font-semibold text-brand-900 transition hover:bg-brand-100"
          >
            Continue to payment
          </button>
        </div>
      </aside>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-brand-200 bg-brand-900/95 px-4 py-3 text-white shadow-soft backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-100">Cart</p>
            <p className="truncate text-sm text-white">
              {cartItems.length ? `${cartItems.length} item${cartItems.length === 1 ? "" : "s"} selected` : "No items in cart yet"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-[0.16em] text-brand-100">Total</p>
            <p className="text-lg font-semibold">{formatCurrency(totalCents)}</p>
          </div>
          <button
            type="submit"
            className="rounded-full bg-white px-4 py-3 text-sm font-semibold text-brand-900 transition hover:bg-brand-100 disabled:opacity-60"
            disabled={!cartItems.length}
          >
            Continue
          </button>
        </div>
      </div>
    </form>
  );
}
