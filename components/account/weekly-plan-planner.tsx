"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getRequiredChoicesForMenuItem } from "@/lib/menu-config";
import { cn, formatCurrency, formatList } from "@/lib/utils";

const weekdays = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" }
] as const;

type ChildSummary = {
  id: string;
  schoolId: string;
  schoolName: string;
  studentName: string;
  grade: string;
};

type MenuOptionSummary = {
  id: string;
  name: string;
  optionType: "ADD_ON" | "REMOVAL";
  priceDeltaCents: number;
};

type MenuItemSummary = {
  id: string;
  name: string;
  slug: string;
  basePriceCents: number;
  options: MenuOptionSummary[];
};

type WeeklyPlanSummary = {
  id: string;
  parentChildId: string;
  weekday: number;
  menuItemId: string;
  menuItemName: string;
  menuItemSlug: string;
  choice: string | null;
  additions: string[];
  removals: string[];
  isActive: boolean;
  sortOrder: number;
};

type WeeklyAvailability = {
  eligibleWeekdays: number[];
  menuItemIdsByWeekday: Record<string, string[]>;
  deliveryDateIsoByWeekday: Record<string, string>;
  deliveryDateLabelByWeekday: Record<string, string>;
};

type PlannerProps = {
  children: ChildSummary[];
  menuItems: MenuItemSummary[];
  weeklyAvailabilityBySchoolId: Record<string, WeeklyAvailability>;
  existingPlans: WeeklyPlanSummary[];
};

type DraftValue = {
  menuItemId: string;
  choice: string;
  additions: string[];
  removals: string[];
};

type DraftState = Record<number, DraftValue>;

function createEmptyDraft(): DraftValue {
  return {
    menuItemId: "",
    choice: "",
    additions: [],
    removals: []
  };
}

export function WeeklyPlanPlanner({ children, menuItems, weeklyAvailabilityBySchoolId, existingPlans }: PlannerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedChildId, setSelectedChildId] = useState(children[0]?.id ?? "");
  const [selectedWeekday, setSelectedWeekday] = useState<number>(1);
  const [error, setError] = useState("");
  const [drafts, setDrafts] = useState<DraftState>({
    1: createEmptyDraft(),
    2: createEmptyDraft(),
    3: createEmptyDraft(),
    4: createEmptyDraft(),
    5: createEmptyDraft()
  });

  const selectedChild = children.find((child) => child.id === selectedChildId);
  const activeAvailability = selectedChild ? weeklyAvailabilityBySchoolId[selectedChild.schoolId] : undefined;
  const eligibleWeekdays = activeAvailability?.eligibleWeekdays ?? [];
  const eligibleWeekdaysSet = useMemo(() => new Set(eligibleWeekdays), [eligibleWeekdays]);
  const selectedDateLabel = activeAvailability?.deliveryDateLabelByWeekday[String(selectedWeekday)] ?? "";
  const plansByWeekday = useMemo(() => {
    const filtered = existingPlans.filter((plan) => plan.parentChildId === selectedChildId);
    return weekdays.reduce<Record<number, WeeklyPlanSummary[]>>((acc, weekday) => {
      acc[weekday.value] = filtered
        .filter((plan) => plan.weekday === weekday.value)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.menuItemName.localeCompare(b.menuItemName));
      return acc;
    }, {});
  }, [existingPlans, selectedChildId]);

  const visibleWeekdays = useMemo(() => {
    const plannedWeekdays = new Set(
      existingPlans.filter((plan) => plan.parentChildId === selectedChildId).map((plan) => plan.weekday)
    );
    return weekdays.filter((weekday) => eligibleWeekdaysSet.has(weekday.value) || plannedWeekdays.has(weekday.value));
  }, [eligibleWeekdaysSet, existingPlans, selectedChildId]);

  useEffect(() => {
    if (!visibleWeekdays.length) {
      setSelectedWeekday(1);
      return;
    }

    if (!visibleWeekdays.some((weekday) => weekday.value === selectedWeekday)) {
      setSelectedWeekday(visibleWeekdays[0].value);
    }
  }, [selectedChildId, selectedWeekday, visibleWeekdays]);

  const activeDayPlans = plansByWeekday[selectedWeekday] ?? [];
  const activeDraft = drafts[selectedWeekday];
  const menuItemIdsForActiveDay = activeAvailability?.menuItemIdsByWeekday[String(selectedWeekday)] ?? [];
  const menuItemIdsForActiveDaySet = useMemo(() => new Set(menuItemIdsForActiveDay), [menuItemIdsForActiveDay]);
  const availableMenuItemsForActiveDay = useMemo(
    () => menuItems.filter((item) => menuItemIdsForActiveDaySet.has(item.id)),
    [menuItemIdsForActiveDaySet, menuItems]
  );
  const activeMenuItem = availableMenuItemsForActiveDay.find((item) => item.id === activeDraft.menuItemId);
  const activeRequiredChoices = activeMenuItem ? getRequiredChoicesForMenuItem(activeMenuItem.slug) : [];
  const activeAddOnOptions =
    activeMenuItem?.options.filter(
      (option) => option.optionType === "ADD_ON" && !activeRequiredChoices.includes(option.name)
    ) ?? [];
  const activeRemovalOptions =
    activeMenuItem?.options.filter((option) => option.optionType === "REMOVAL") ?? [];
  const isActiveWeekdayEligible = eligibleWeekdaysSet.has(selectedWeekday);
  const canAddForDay = isActiveWeekdayEligible && menuItemIdsForActiveDay.length > 0;

  function updateDraft(weekday: number, next: Partial<DraftValue>) {
    setDrafts((current) => ({
      ...current,
      [weekday]: {
        ...current[weekday],
        ...next
      }
    }));
  }

  function resetDraft(weekday: number) {
    setDrafts((current) => ({
      ...current,
      [weekday]: createEmptyDraft()
    }));
  }

  function toggleSelection(
    weekday: number,
    key: "additions" | "removals",
    value: string
  ) {
    setDrafts((current) => {
      const existing = current[weekday][key];
      return {
        ...current,
        [weekday]: {
          ...current[weekday],
          [key]: existing.includes(value)
            ? existing.filter((item) => item !== value)
            : [...existing, value]
        }
      };
    });
  }

  async function runMutation(
    input: { method: "POST" | "PATCH" | "DELETE"; body: Record<string, unknown> },
    onSuccess?: () => void
  ) {
    setError("");
    const response = await fetch("/api/account/weekly-plans", {
      method: input.method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input.body)
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(data.error || "Unable to save weekly plan changes.");
      return;
    }

    onSuccess?.();
    startTransition(() => {
      router.refresh();
    });
  }

  function handleAdd(weekday: number) {
    if (!selectedChild) {
      setError("Choose a child before adding meals.");
      return;
    }

    if (!eligibleWeekdaysSet.has(weekday)) {
      setError("This day is not scheduled for delivery yet. Check with the admin dashboard before adding meals.");
      return;
    }

    const menuItemIdsForDay = activeAvailability?.menuItemIdsByWeekday[String(weekday)] ?? [];
    if (!menuItemIdsForDay.length) {
      setError("No menu items are available for this delivery day yet.");
      return;
    }

    const draft = drafts[weekday];
    const menuItemIdsForDaySet = new Set(menuItemIdsForDay);
    const menuItem = menuItems.find((item) => item.id === draft.menuItemId && menuItemIdsForDaySet.has(item.id));

    if (!menuItem) {
      setError(`Choose an item for ${weekdays.find((day) => day.value === weekday)?.label}.`);
      return;
    }

    const requiredChoices = getRequiredChoicesForMenuItem(menuItem.slug);
    if (requiredChoices.length && !draft.choice) {
      setError(`Choose a required option for ${menuItem.name}.`);
      return;
    }

    void runMutation(
      {
        method: "POST",
        body: {
          parentChildId: selectedChild.id,
          weekday,
          menuItemId: menuItem.id,
          choice: draft.choice || null,
          additions: draft.additions,
          removals: draft.removals
        }
      },
      () => resetDraft(weekday)
    );
  }

  return (
    <div className="space-y-5 border-t border-slate-100 pt-5">
      {children.length ? (
        <>
          <div className="space-y-3">
            <p className="text-sm font-semibold text-ink">1. Pick a child</p>
            <div className="grid gap-3 md:grid-cols-2">
              {children.map((child) => {
                const isSelected = child.id === selectedChildId;
                return (
                  <button
                    key={child.id}
                    type="button"
                    onClick={() => {
                      setSelectedChildId(child.id);
                      const childEligibleWeekdays = new Set(
                        weeklyAvailabilityBySchoolId[child.schoolId]?.eligibleWeekdays ?? []
                      );
                      const hasPlanForWeekday = (weekday: number) =>
                        existingPlans.some((plan) => plan.parentChildId === child.id && plan.weekday === weekday);
                      const childVisibleWeekdays = weekdays.filter(
                        (weekday) => childEligibleWeekdays.has(weekday.value) || hasPlanForWeekday(weekday.value)
                      );
                      const firstDayWithPlans =
                        childVisibleWeekdays.find((day) => hasPlanForWeekday(day.value))?.value ??
                        childVisibleWeekdays[0]?.value ??
                        1;
                      setSelectedWeekday(firstDayWithPlans);
                      setError("");
                    }}
                    className={cn(
                      "rounded-2xl border p-4 text-left transition",
                      isSelected ? "border-brand-500 bg-brand-50" : "border-slate-200 hover:border-brand-200"
                    )}
                  >
                    <p className="font-semibold text-ink">{child.studentName}</p>
                    <p className="text-sm text-slate-600">
                      Grade {child.grade} | {child.schoolName}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedChild ? (
            <div className="space-y-4">
              <div className="rounded-2xl bg-brand-50 p-4">
                <p className="text-sm font-semibold text-brand-700">2. Build {selectedChild.studentName}&rsquo;s week</p>
                <p className="mt-1 text-sm text-slate-600">
                  Pick a day, review what is already planned, and add more items only for that day.
                </p>
              </div>

              {visibleWeekdays.length ? (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {visibleWeekdays.map((weekday) => {
                    const count = plansByWeekday[weekday.value]?.length ?? 0;
                    const isActive = selectedWeekday === weekday.value;
                    const isEligible = eligibleWeekdaysSet.has(weekday.value);
                    const menuCount = activeAvailability?.menuItemIdsByWeekday[String(weekday.value)]?.length ?? 0;
                    const dateLabel = activeAvailability?.deliveryDateLabelByWeekday[String(weekday.value)] ?? "";
                    return (
                      <button
                        key={weekday.value}
                        type="button"
                        onClick={() => {
                          setSelectedWeekday(weekday.value);
                          setError("");
                        }}
                        className={cn(
                          "min-w-[110px] rounded-2xl border px-4 py-3 text-left transition",
                          isActive ? "border-brand-500 bg-brand-50" : "border-slate-200 bg-white hover:border-brand-200"
                        )}
                      >
                        <p className="text-sm font-semibold text-ink">{weekday.label}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {count
                            ? `${count} planned`
                            : !isEligible
                              ? "Not scheduled"
                              : menuCount
                                ? "Open"
                                : "No menu"}
                        </p>
                        {dateLabel ? <p className="mt-1 text-xs font-semibold text-slate-600">{dateLabel}</p> : null}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="rounded-2xl bg-white/80 p-4 text-sm text-slate-600">
                  No delivery dates are available for the upcoming week yet.
                </p>
              )}

              <div className="rounded-3xl border border-slate-100 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-ink">
                      {weekdays.find((day) => day.value === selectedWeekday)?.label}
                      {selectedDateLabel ? ` (${selectedDateLabel})` : ""}
                    </p>
                    <p className="text-sm text-slate-500">
                      {activeDayPlans.length
                        ? `${activeDayPlans.length} item${activeDayPlans.length === 1 ? "" : "s"} planned`
                        : "No meals saved yet"}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                    {selectedChild.schoolName}
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  {activeDayPlans.length ? (
                    activeDayPlans.map((plan) => {
                      const requiredChoices = getRequiredChoicesForMenuItem(plan.menuItemSlug);
                      const missingRequiredChoice =
                        requiredChoices.length && (!plan.choice || !requiredChoices.includes(plan.choice));

                      return (
                        <div key={plan.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1 text-sm text-slate-600">
                              <p className="font-semibold text-ink">{plan.menuItemName}</p>
                              <p>Choice: {plan.choice || "None"}</p>
                              {missingRequiredChoice ? (
                                <p className="font-semibold text-rose-700">Missing required choice (remove and re-add).</p>
                              ) : null}
                              <p>Add-ons: {formatList(plan.additions)}</p>
                              <p>Removals: {plan.removals.length ? plan.removals.join(", ") : "No changes"}</p>
                              <p>Status: {plan.isActive ? "Active" : "Paused"}</p>
                            </div>
                            <div className="flex flex-col gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  void runMutation({
                                    method: "PATCH",
                                    body: { planId: plan.id, isActive: !plan.isActive }
                                  })
                                }
                                className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-ink"
                              >
                                {plan.isActive ? "Pause" : "Resume"}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  void runMutation({
                                    method: "DELETE",
                                    body: { planId: plan.id }
                                  })
                                }
                                className="rounded-full border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-500">Nothing saved for this day yet.</p>
                  )}
                </div>

                <div className="mt-4 rounded-2xl border border-brand-100 bg-brand-50 p-4">
                  <p className="text-sm font-semibold text-ink">
                    Add an item for {weekdays.find((day) => day.value === selectedWeekday)?.label}
                  </p>
                  {!isActiveWeekdayEligible ? (
                    <p className="mt-2 rounded-2xl bg-white/80 px-4 py-3 text-sm text-slate-600">
                      No delivery date is scheduled for this weekday yet. Add a delivery date in the admin dashboard to open ordering.
                    </p>
                  ) : null}
                  {isActiveWeekdayEligible && !menuItemIdsForActiveDay.length ? (
                    <p className="mt-2 rounded-2xl bg-white/80 px-4 py-3 text-sm text-slate-600">
                      This delivery date is open, but no menu items are marked as available yet.
                    </p>
                  ) : null}
                  <div className="mt-3 space-y-3">
                    <select
                      className="w-full rounded-2xl border-slate-200"
                      value={activeDraft.menuItemId}
                      disabled={!canAddForDay}
                      onChange={(event) =>
                        updateDraft(selectedWeekday, {
                          menuItemId: event.target.value,
                          choice: "",
                          additions: [],
                          removals: []
                        })
                      }
                    >
                      <option value="">{canAddForDay ? "Choose menu item" : "Menu items unavailable"}</option>
                      {availableMenuItemsForActiveDay.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} - {formatCurrency(item.basePriceCents)}
                        </option>
                      ))}
                    </select>

                    {activeRequiredChoices.length ? (
                      <select
                        className="w-full rounded-2xl border-slate-200"
                        value={activeDraft.choice}
                        onChange={(event) => updateDraft(selectedWeekday, { choice: event.target.value })}
                      >
                        <option value="">Choose required option</option>
                        {activeRequiredChoices.map((choice) => (
                          <option key={choice} value={choice}>
                            {choice}
                          </option>
                        ))}
                      </select>
                    ) : null}

                    {activeMenuItem ? (
                      <div className="grid gap-4 lg:grid-cols-2">
                        <div className="space-y-3">
                          <p className="text-sm font-semibold text-ink">Add-ons</p>
                          {activeAddOnOptions.length ? (
                            activeAddOnOptions.map((option) => (
                              <label
                                key={option.id}
                                className={cn(
                                  "flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition",
                                  activeDraft.additions.includes(option.name)
                                    ? "border-brand-500 bg-white"
                                    : "border-slate-200 bg-white/80"
                                )}
                              >
                                <input
                                  type="checkbox"
                                  checked={activeDraft.additions.includes(option.name)}
                                  onChange={() => toggleSelection(selectedWeekday, "additions", option.name)}
                                  className="rounded border-slate-300"
                                />
                                <span className="font-medium text-ink">
                                  {option.name}
                                  {option.priceDeltaCents ? ` (+${formatCurrency(option.priceDeltaCents)})` : ""}
                                </span>
                              </label>
                            ))
                          ) : (
                            <p className="rounded-2xl bg-white/80 px-4 py-3 text-sm text-slate-500">
                              No add-ons for this item.
                            </p>
                          )}
                        </div>

                        <div className="space-y-3">
                          <p className="text-sm font-semibold text-ink">Removals</p>
                          {activeMenuItem.slug === "build-your-own-burger" ? (
                            <label
                              className={cn(
                                "flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition",
                                activeDraft.removals.length === 0
                                  ? "border-brand-500 bg-white"
                                  : "border-slate-200 bg-white/80"
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={activeDraft.removals.length === 0}
                                onChange={() => updateDraft(selectedWeekday, { removals: [] })}
                                className="rounded border-slate-300"
                              />
                              <span className="font-medium text-ink">No changes</span>
                            </label>
                          ) : null}

                          {activeRemovalOptions.length ? (
                            activeRemovalOptions.map((option) => (
                              <label
                                key={option.id}
                                className={cn(
                                  "flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition",
                                  activeDraft.removals.includes(option.name)
                                    ? "border-brand-500 bg-white"
                                    : "border-slate-200 bg-white/80"
                                )}
                              >
                                <input
                                  type="checkbox"
                                  checked={activeDraft.removals.includes(option.name)}
                                  onChange={() => toggleSelection(selectedWeekday, "removals", option.name)}
                                  className="rounded border-slate-300"
                                />
                                <span className="font-medium text-ink">{option.name}</span>
                              </label>
                            ))
                          ) : (
                            <p className="rounded-2xl bg-white/80 px-4 py-3 text-sm text-slate-500">
                              No removals for this item.
                            </p>
                          )}
                        </div>
                      </div>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => handleAdd(selectedWeekday)}
                      disabled={isPending || !canAddForDay}
                      className="rounded-full bg-brand-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      Add item to {weekdays.find((day) => day.value === selectedWeekday)?.label}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
          Add a saved child first to start building a weekly lunch plan.
        </p>
      )}

      {error ? <p className="rounded-2xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}
    </div>
  );
}
