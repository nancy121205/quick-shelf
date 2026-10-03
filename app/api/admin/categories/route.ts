import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, serverError } from "../../../../lib/admin-api";
import { createCategorySlug } from "../../../../lib/integrations/category-normalizer";
import { prisma } from "../../../../lib/prisma";

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const categories = await prisma.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true, slug: true, visible: true, sortOrder: true, parentId: true, _count: { select: { products: true } } } });
    return NextResponse.json({ success: true, data: categories });
  } catch (error) {
    return serverError(error, "Unable to load admin categories");
  }
}

export async function POST(request: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const body = (await request.json()) as { name?: unknown; slug?: unknown; visible?: unknown; sortOrder?: unknown; parentId?: unknown };
    if (typeof body.name !== "string" || !body.name.trim()) return NextResponse.json({ success: false, error: "Category name is required" }, { status: 400 });
    const category = await prisma.category.create({ data: { name: body.name.trim(), slug: typeof body.slug === "string" && body.slug.trim() ? createCategorySlug(body.slug) : createCategorySlug(body.name), visible: typeof body.visible === "boolean" ? body.visible : true, sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : 0, parentId: typeof body.parentId === "string" ? body.parentId : null } });
    return NextResponse.json({ success: true, data: category }, { status: 201 });
  } catch (error) {
    return serverError(error, "Unable to create category");
  }
}