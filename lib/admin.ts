import { OrderStatus, PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ALLOWED_SCHOOL_SLUGS } from "@/lib/school-config";

export async function getAdminDashboardSummary() {
  const [paidOrders, pendingOrders, refundedOrders, schools, upcomingDeliveryDates] = await Promise.all([
    prisma.order.count({ where: { status: OrderStatus.PAID, school: { slug: { in: [...ALLOWED_SCHOOL_SLUGS] } } } }),
    prisma.order.count({ where: { status: OrderStatus.PENDING, school: { slug: { in: [...ALLOWED_SCHOOL_SLUGS] } } } }),
    prisma.order.count({ where: { status: OrderStatus.REFUNDED, school: { slug: { in: [...ALLOWED_SCHOOL_SLUGS] } } } }),
    prisma.school.count({ where: { isActive: true, slug: { in: [...ALLOWED_SCHOOL_SLUGS] } } }),
    prisma.deliveryDate.findMany({
      where: { deliveryDate: { gte: new Date() }, school: { slug: { in: [...ALLOWED_SCHOOL_SLUGS] } } },
      include: { school: true },
      take: 5,
      orderBy: { deliveryDate: "asc" }
    })
  ]);

  return {
    paidOrders,
    pendingOrders,
    refundedOrders,
    schools,
    upcomingDeliveryDates
  };
}

export async function setOrderStatus(orderId: string, status: OrderStatus) {
  const now = new Date();
  return prisma.order.update({
    where: { id: orderId },
    data: {
      status,
      cancelledAt: status === OrderStatus.CANCELLED ? now : null,
      refundedAt: status === OrderStatus.REFUNDED ? now : null,
      payment: status === OrderStatus.REFUNDED ? { update: { status: PaymentStatus.REFUNDED, refundedAt: now } } : undefined
    }
  });
}
