import { NextRequest, NextResponse } from "next/server";
import type { SourceType } from "../../../../app/generated/prisma/client";
import { requireAdmin, serverError } from "../../../../lib/admin-api";
import { prisma } from "../../../../lib/prisma";

export async function GET(request: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const params = request.nextUrl.searchParams;
    const search = params.get("search")?.trim();
    const source = params.get("source");
    const sourceType: SourceType | undefined = source === "SHOPIFY" || source === "WOOCOMMERCE" ? source : undefined;
    const categoryId = params.get("categoryId");
    const where = {
      ...(search ? { OR: [{ name: { contains: search, mode: "insensitive" as const } }, { sku: { contains: search, mode: "insensitive" as const } }] } : {}),
      ...(sourceType ? { sourceType } : {}),
      ...(categoryId ? { categoryId } : {}),
    };
    const products = await prisma.product.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: 200,
      select: { id: true, name: true, sku: true, description: true, price: true, stock: true, status: true, sourceType: true, updatedAt: true, categoryId: true, category: { select: { id: true, name: true } } },
    });
    return NextResponse.json({ success: true, data: products });
  } catch (error) {
    return serverError(error, "Unable to load admin products");
  }
}

export async function POST(request: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const body = (await request.json()) as { name?: unknown; sourceType?: unknown; sourceId?: unknown };
    if (typeof body.name !== "string" || !body.name.trim() || (body.sourceType !== "SHOPIFY" && body.sourceType !== "WOOCOMMERCE") || typeof body.sourceId !== "string" || !body.sourceId.trim()) {
      return NextResponse.json({ success: false, error: "Name, source, and source ID are required" }, { status: 400 });
    }
    const product = await prisma.product.create({ data: { name: body.name.trim(), sourceType: body.sourceType, sourceId: body.sourceId.trim() } });
    return NextResponse.json({ success: true, data: product }, { status: 201 });
  } catch (error) {
    return serverError(error, "Unable to create product");
  }
}