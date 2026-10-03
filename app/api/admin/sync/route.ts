import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, serverError } from "../../../../lib/admin-api";
import { fetchAllShopifyProducts } from "../../../../lib/integrations/shopify/client";
import { mapShopifyProduct } from "../../../../lib/integrations/shopify/mapper";
import { fetchWooCommerceProducts } from "../../../../lib/integrations/woocommerce/client";
import { mapWooCommerceProduct } from "../../../../lib/integrations/woocommerce/mapper";
import { importProducts } from "../../../../lib/sync/import-service";
import { prisma } from "../../../../lib/prisma";

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  try {
    const syncs = await prisma.syncLog.findMany({ orderBy: { startedAt: "desc" }, take: 30, select: { id: true, sourceType: true, status: true, startedAt: true, finishedAt: true, productsCreated: true, productsUpdated: true, productsFailed: true, errors: true } });
    return NextResponse.json({ success: true, data: syncs });
  } catch (error) {
    return serverError(error, "Unable to load sync history");
  }
}

export async function POST(request: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  try {
    const body = (await request.json()) as { source?: unknown };
    if (body.source !== "SHOPIFY" && body.source !== "WOOCOMMERCE") return NextResponse.json({ success: false, error: "A valid source is required" }, { status: 400 });
    const products = body.source === "SHOPIFY" ? (await fetchAllShopifyProducts()).map(mapShopifyProduct) : (await fetchWooCommerceProducts()).map(mapWooCommerceProduct);
    const summary = await importProducts({ sourceType: body.source, products });
    return NextResponse.json({ success: true, data: { fetched: products.length, ...summary } });
  } catch (error) {
    return serverError(error, "Unable to run source sync");
  }
}