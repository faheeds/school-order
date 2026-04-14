import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { assertParentApiRequest } from "@/lib/parent-auth";
import { getRequiredChoicesForMenuItem } from "@/lib/menu-config";

export async function POST(request: Request) {
  try {
    const session = await assertParentApiRequest();
    const parentUserId = session.user?.parentUserId;
    if (!parentUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parentChildId = String(body.parentChildId || "");
    const menuItemId = String(body.menuItemId || "");
    const weekday = Number(body.weekday);
    const choice = String(body.choice || "") || null;
    const additions = Array.isArray(body.additions) ? body.additions.map(String) : [];
    const removals = Array.isArray(body.removals) ? body.removals.map(String) : [];

    const parentChild = await prisma.parentChild.findFirst({
      where: { id: parentChildId, parentUserId, archivedAt: null }
    });

    if (!parentChild) {
      return NextResponse.json({ error: "Saved child not found." }, { status: 404 });
    }

    const menuItem = await prisma.menuItem.findUnique({
      where: { id: menuItemId },
      include: { options: true }
    });

    if (!menuItem) {
      return NextResponse.json({ error: "Menu item not found." }, { status: 404 });
    }

    const requiredChoices = getRequiredChoicesForMenuItem(menuItem.slug);
    if (requiredChoices.length && (!choice || !requiredChoices.includes(choice))) {
      return NextResponse.json({ error: `Choose a required option for ${menuItem.name}.` }, { status: 400 });
    }

    const addOnSet = new Set(
      menuItem.options.filter((option) => option.optionType === "ADD_ON").map((option) => option.name)
    );
    const removalSet = new Set(
      menuItem.options.filter((option) => option.optionType === "REMOVAL").map((option) => option.name)
    );

    if (!additions.every((value: string) => addOnSet.has(value))) {
      return NextResponse.json({ error: `One or more add-ons are invalid for ${menuItem.name}.` }, { status: 400 });
    }

    if (!removals.every((value: string) => removalSet.has(value))) {
      return NextResponse.json({ error: `One or more removals are invalid for ${menuItem.name}.` }, { status: 400 });
    }

    const existingCount = await prisma.weeklyLunchPlan.count({
      where: { parentChildId, weekday }
    });

    const plan = await prisma.weeklyLunchPlan.create({
      data: {
        parentUserId,
        parentChildId,
        schoolId: parentChild.schoolId,
        weekday,
        menuItemId,
        choice,
        additions,
        removals,
        sortOrder: existingCount,
        isActive: true
      }
    });

    return NextResponse.json({ id: plan.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save weekly plan.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await assertParentApiRequest();
    const parentUserId = session.user?.parentUserId;
    if (!parentUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const planId = String(body.planId || "");
    const isActive = Boolean(body.isActive);

    const plan = await prisma.weeklyLunchPlan.findFirst({
      where: { id: planId, parentUserId }
    });

    if (!plan) {
      return NextResponse.json({ error: "Weekly plan not found." }, { status: 404 });
    }

    await prisma.weeklyLunchPlan.update({
      where: { id: planId },
      data: { isActive }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update weekly plan.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await assertParentApiRequest();
    const parentUserId = session.user?.parentUserId;
    if (!parentUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const planId = String(body.planId || "");

    const plan = await prisma.weeklyLunchPlan.findFirst({
      where: { id: planId, parentUserId }
    });

    if (!plan) {
      return NextResponse.json({ error: "Weekly plan not found." }, { status: 404 });
    }

    await prisma.weeklyLunchPlan.delete({
      where: { id: planId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to remove weekly plan item.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
