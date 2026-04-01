import { OrderStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateLabelsPdfBuffer, mapOrderToLabelRows, type LabelFormat } from "@/lib/pdf/labels";
import { assertAdminApiRequest } from "@/lib/admin-auth";

export async function GET(request: Request) {
  try {
    await assertAdminApiRequest();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const deliveryDateId = searchParams.get("deliveryDateId");
  const format = searchParams.get("format") ?? "pdf";
  const labelFormat = (searchParams.get("labelFormat") ?? "standard") as LabelFormat;

  const orders = await prisma.order.findMany({
    where: {
      deliveryDateId: deliveryDateId ?? undefined,
      status: OrderStatus.PAID
    },
    include: {
      school: true,
      deliveryDate: true,
      student: true,
      items: true
    },
    orderBy: { createdAt: "asc" }
  });

  if (format === "json") {
    return NextResponse.json({ labels: mapOrderToLabelRows(orders) });
  }

  const buffer = await generateLabelsPdfBuffer(orders, labelFormat);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${labelFormat}-labels.pdf"`
    }
  });
}
