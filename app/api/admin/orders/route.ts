import { NextResponse } from "next/server";
import { assertAdminApiRequest } from "@/lib/admin-auth";
import { listOrders } from "@/lib/orders";

export async function GET(request: Request) {
  try {
    await assertAdminApiRequest();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const orders = await listOrders({
    deliveryDateId: searchParams.get("deliveryDateId") ?? undefined,
    schoolId: searchParams.get("schoolId") ?? undefined,
    status: searchParams.get("status") ?? undefined
  });

  return NextResponse.json({ orders });
}
