import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, serverError } from "../../../../../lib/admin-api";
import { createCategorySlug } from "../../../../../lib/integrations/category-normalizer";
import { prisma } from "../../../../../lib/prisma";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const { id } = await context.params;
    const body = (await request.json()) as { name?: unknown; slug?: unknown; visible?: unknown; sortOrder?: unknown; parentId?: unknown };
    if (body.parentId === id) return NextResponse.json({ success: false, error: "A category cannot be its own parent" }, { status: 400 });
    const data = { ...(typeof body.name === "string" ? { name: body.name.trim() } : {}), ...(typeof body.slug === "string" ? { slug: createCategorySlug(body.slug) } : {}), ...(typeof body.visible === "boolean" ? { visible: body.visible } : {}), ...(typeof body.sortOrder === "number" ? { sortOrder: body.sortOrder } : {}), ...(typeof body.parentId === "string" ? { parentId: body.parentId } : body.parentId === null ? { parentId: null } : {}) };
    const category = await prisma.category.update({ where: { id }, data });
    return NextResponse.json({ success: true, data: category });
  } catch (error) {
    return serverError(error, "Unable to update category");
  }
}

export async function DELETE(_request: NextRequest, context: Context) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const { id } = await context.params;
    await prisma.$transaction([prisma.product.updateMany({ where: { categoryId: id }, data: { categoryId: null } }), prisma.category.updateMany({ where: { parentId: id }, data: { parentId: null } }), prisma.category.delete({ where: { id } })]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return serverError(error, "Unable to delete category");
  }
}