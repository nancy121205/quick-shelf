import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const product = await prisma.product.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        sourceType: true,
        sourceId: true,
        sourceUrl: true,
        name: true,
        sku: true,
        description: true,
        price: true,
        stock: true,
        status: true,
        images: true,
        variants: true,
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        createdAt: true,
        updatedAt: true,
        lastSyncedAt: true,
      },
    });

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          error: "Product not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error("Failed to fetch product:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to load product",
      },
      { status: 500 }
    );
  }
}
