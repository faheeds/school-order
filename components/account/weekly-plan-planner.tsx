"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getRequiredChoicesForMenuItem } from "@/lib/menu-config";

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

type MenuItemSummary = {
  id: string;
  name: string;
  slug: string;
};

type WeeklyPlanSummary = {
  id: string;
  parentChildId: string;
  weekday: number;
  menuItemId: string;
  menuItemName: string;
  choice: string | null;
  isActive: boolean;
  sortOrder: number;
};

type PlannerProps = {
  children: ChildSummary[];
  menuItems: MenuItemSummary[];
  existingPlans: WeeklyPlanSummary[];
};

type DraftState = Record<number, { menuItemId: string; choice: string }>;

export function WeeklyPlanPlanner({ children, menuItems, existingPlans }: PlannerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedChildId, setSelectedChildId] = useState(children[0]?.id ?? "");
  const [error, setError] = useState("");
  const [drafts, setDrafts] = useState<DraftState>({
    1: { menuItemId: "", choice: "" },
    2: { menuItemId: "", choice: "" },
    3: { menuItemId: "", choice: "" },
    4: { menuItemId: "", choice: "" },
    5: { menuItemId: "", choice: "" }
  });

  const selectedChild = children.find((child) => child.id === selectedChildId);
  const plansByWeekday = useMemo(() => {
    const filtered = existingPlans.filter((plan) => plan.parentChildId === selectedChildId);
    return weekdays.reduce<Record<number, WeeklyPlanSummary[]>>((acc, weekday) => {
      acc[weekday.value] = filtered
        .filter((plan) => plan.weekday === weekday.value)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.menuItemName.localeCompare(b.menuItemName));
      return acc;
    }, {});
  }, [existingPlans, selectedChildId]);

  function updateDraft(weekday: number, next: Partial<{ menuItemId: string; choice: string }>) {
    setDrafts((current) => ({
      ...current,
      [weekday]: {
        ...current[weekday],
        ...next
      }
    }));
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

    const draft = drafts[weekday];
    const menuItem = menuItems.find((item) => item.id === draft.menuItemId);

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
          choice: draft.choice || null
        }
      },
      () => updateDraft(weekday, { menuItemId: "", choice: "" })
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
                      setError("");
                    }}
                    className={`rounded-2xl border p-4 text-left transition ${
                      isSelected ? "border-brand-500 bg-brand-50" : "border-slate-200 hover:border-brand-200"
                    }`}
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
                  Each day card shows current items for {selectedChild.schoolName}. Add one item at a time, or stack multiple items on the same day.
                </p>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                {weekdays.map((weekday) => {
                  const plans = plansByWeekday[weekday.value] ?? [];
                  const draft = drafts[weekday.value];
                  const selectedMenuItem = menuItems.find((item) => item.id === draft.menuItemId);
                  const requiredChoices = selectedMenuItem ? getRequiredChoicesForMenuItem(selectedMenuItem.slug) : [];

                  return (
                    <div key={weekday.value} className="rounded-3xl border border-slate-100 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-lg font-semibold text-ink">{weekday.label}</p>
                          <p className="text-sm text-slate-500">
                            {plans.length ? `${plans.length} item${plans.length === 1 ? "" : "s"} planned` : "No meals saved yet"}
                          </p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                          {selectedChild.schoolName}
                        </span>
                      </div>

                      <div className="mt-4 space-y-3">
                        {plans.length ? (
                          plans.map((plan) => (
                            <div key={plan.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="space-y-1 text-sm text-slate-600">
                                  <p className="font-semibold text-ink">{plan.menuItemName}</p>
                                  <p>Choice: {plan.choice || "None"}</p>
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
                          ))
                        ) : (
                          <p className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-500">Nothing saved for this day yet.</p>
                        )}
                      </div>

                      <div className="mt-4 rounded-2xl border border-brand-100 bg-brand-50 p-4">
                        <p className="text-sm font-semibold text-ink">Add an item for {weekday.label}</p>
                        <div className="mt-3 space-y-3">
                          <select
                            className="w-full rounded-2xl border-slate-200"
                            value={draft.menuItemId}
                            onChange={(event) => updateDraft(weekday.value, { menuItemId: event.target.value, choice: "" })}
                          >
                            <option value="">Choose menu item</option>
                            {menuItems.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name}
                              </option>
                            ))}
                          </select>

                          {requiredChoices.length ? (
                            <select
                              className="w-full rounded-2xl border-slate-200"
                              value={draft.choice}
                              onChange={(event) => updateDraft(weekday.value, { choice: event.target.value })}
                            >
                              <option value="">Choose required option</option>
                              {requiredChoices.map((choice) => (
                                <option key={choice} value={choice}>
                                  {choice}
                                </option>
                              ))}
                            </select>
                          ) : null}

                          <button
                            type="button"
                            onClick={() => handleAdd(weekday.value)}
                            disabled={isPending}
                            className="rounded-full bg-brand-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
                          >
                            Add item to {weekday.label}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
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
