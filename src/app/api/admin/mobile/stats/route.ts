import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAdminRequest } from "@/lib/admin-auth";

export async function GET(req: Request) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOf7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const startOf30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const REVENUE_STATUSES = ["confirmed", "ready_to_ship", "shipped", "delivered", "paid"];

  const [
    ordersToday,
    orders7d,
    orders30d,
    pending,
    revenueToday,
    revenue7d,
    revenue30d,
    productsCount,
    lowStock,
  ] = await Promise.all([
    db.order.count({ where: { createdAt: { gte: startOfToday }, status: { not: "cart_abandoned" } } }),
    db.order.count({ where: { createdAt: { gte: startOf7d }, status: { not: "cart_abandoned" } } }),
    db.order.count({ where: { createdAt: { gte: startOf30d }, status: { not: "cart_abandoned" } } }),
    db.order.count({ where: { status: "pending" } }),
    db.order.aggregate({ _sum: { total: true }, where: { createdAt: { gte: startOfToday }, status: { in: REVENUE_STATUSES } } }),
    db.order.aggregate({ _sum: { total: true }, where: { createdAt: { gte: startOf7d }, status: { in: REVENUE_STATUSES } } }),
    db.order.aggregate({ _sum: { total: true }, where: { createdAt: { gte: startOf30d }, status: { in: REVENUE_STATUSES } } }),
    db.product.count(),
    db.product.findMany({
      where: { stock: { lt: 5 } },
      select: { id: true, title: true, stock: true, image: true },
      orderBy: { stock: "asc" },
      take: 10,
    }),
  ]);

  // Top products in last 30d
  const topItems = await db.orderItem.groupBy({
    by: ["productId"],
    where: { order: { createdAt: { gte: startOf30d }, status: { in: REVENUE_STATUSES } } },
    _sum: { qty: true, price: true },
    orderBy: { _sum: { qty: "desc" } },
    take: 5,
  });
  const topProductIds = topItems.map((t) => t.productId);
  const topProducts = topProductIds.length
    ? await db.product.findMany({
        where: { id: { in: topProductIds } },
        select: { id: true, title: true, image: true, price: true },
      })
    : [];
  const topProductsEnriched = topItems.map((t) => {
    const p = topProducts.find((pp) => pp.id === t.productId);
    return {
      id: t.productId,
      title: p?.title ?? "(deleted)",
      image: p?.image ?? null,
      qty: t._sum.qty ?? 0,
      revenue: (t._sum.qty ?? 0) * (p?.price ?? 0),
    };
  });

  return NextResponse.json({
    counts: { ordersToday, orders7d, orders30d, pending, productsCount },
    revenue: {
      today: revenueToday._sum.total ?? 0,
      week: revenue7d._sum.total ?? 0,
      month: revenue30d._sum.total ?? 0,
    },
    topProducts: topProductsEnriched,
    lowStock,
  });
}
