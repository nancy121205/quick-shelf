import { NextResponse } from "next/server";
import { requireAdmin, serverError } from "../../../../lib/admin-api";
import { prisma } from "../../../../lib/prisma";

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const [totalProducts, activeProducts, outOfStockProducts, totalCategories, shopifySync, wooSync, recentSyncs] = await Promise.all([
      prisma.product.count(),
      prisma.product.count({ where: { status: true } }),
      prisma.product.count({ where: { OR: [{ stock: null }, { stock: { lte: 0 } }] } }),
      prisma.category.count(),
      prisma.syncLog.findFirst({ where: { sourceType: "SHOPIFY" }, orderBy: { startedAt: "desc" }, select: { id: true, status: true, startedAt: true, finishedAt: true, productsCreated: true, productsUpdated: true, productsFailed: true, errors: true } }),
      prisma.syncLog.findFirst({ where: { sourceType: "WOOCOMMERCE" }, orderBy: { startedAt: "desc" }, select: { id: true, status: true, startedAt: true, finishedAt: true, productsCreated: true, productsUpdated: true, productsFailed: true, errors: true } }),
      prisma.syncLog.findMany({ orderBy: { startedAt: "desc" }, take: 10, select: { id: true, sourceType: true, status: true, startedAt: true, finishedAt: true, productsCreated: true, productsUpdated: true, productsFailed: true, errors: true } }),
    ]);

    return NextResponse.json({ success: true, data: { totalProducts, activeProducts, outOfStockProducts, totalCategories, shopifySync, wooSync, recentSyncs } });
  } catch (error) {
    return serverError(error, "Unable to load dashboard");
  }
}