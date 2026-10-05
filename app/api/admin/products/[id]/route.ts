import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "../../../../../app/generated/prisma/client";
import { requireAdmin, serverError } from "../../../../../lib/admin-api";
import { prisma } from "../../../../../lib/prisma";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const { id } = await context.params;
    const body = (await request.json()) as { name?: unknown; sku?: unknown; description?: unknown; price?: unknown; stock?: unknown; status?: unknown; categoryId?: unknown; images?: unknown };
    const data: Prisma.ProductUpdateInput = {};
    if (typeof body.name === "string") data.name = body.name.trim();
    if (typeof body.sku === "string" || body.sku === null) data.sku = body.sku;
    if (typeof body.description === "string" || body.description === null) data.description = body.description;
    if (typeof body.price === "number" || body.price === null) data.price = body.price;
    if (typeof body.stock === "number" || body.stock === null) data.stock = body.stock;
    if (typeof body.status === "boolean") data.status = body.status;
    if (typeof body.categoryId === "string") data.category = { connect: { id: body.categoryId } };
    if (body.categoryId === null) data.category = { disconnect: true };
    if (Array.isArray(body.images) && body.images.every((image) => typeof image === "string")) data.images = body.images;
    const product = await prisma.product.update({ where: { id }, data, select: { id: true, name: true, sku: true, description: true, price: true, stock: true, status: true, categoryId: true } });
    return NextResponse.json({ success: true, data: product });
  } catch (error) {
    return serverError(error, "Unable to update product");
  }
}

export async function DELETE(_request: NextRequest, context: Context) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const { id } = await context.params;
    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return serverError(error, "Unable to delete product");
  }
}