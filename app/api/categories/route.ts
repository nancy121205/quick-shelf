import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      where: {
        visible: true,
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        visible: true,
        sortOrder: true,
        parentId: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error("Failed to fetch categories:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to load categories",
      },
      { status: 500 }
    );
  }
}