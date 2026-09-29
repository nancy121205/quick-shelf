import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

function parsePositiveInt(
  value: string | null,
  fallback: number,
  min: number,
  max: number
) {
  const parsed = Number.parseInt(value ?? String(fallback), 10);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(Math.max(parsed, min), max);
}

function normalizeStatusFilter(status: string | null) {
  const value = status?.trim().toLowerCase();

  if (!value) {
    return undefined;
  }

  if (["active", "available", "true", "1"].includes(value)) {
    return true;
  }

  if (["inactive", "unavailable", "false", "0"].includes(value)) {
    return false;
  }

  return undefined;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parsePositiveInt(searchParams.get("page"), 1, 1, Number.MAX_SAFE_INTEGER);
    const limit = parsePositiveInt(searchParams.get("limit"), 20, 1, 100);
    const search = searchParams.get("search")?.trim();
    const category = searchParams.get("category")?.trim();
    const statusFilter = normalizeStatusFilter(searchParams.get("status"));

    const where = {
      status: statusFilter ?? true,
      ...(search
        ? {
            OR: [
              {
                name: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
              {
                sku: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
            ],
          }
        : {}),
      ...(category
        ? {
            category: {
              slug: category,
            },
          }
        : {}),
    };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          name: true,
          sku: true,
          price: true,
          stock: true,
          status: true,
          images: true,
          sourceUrl: true,
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      }),
      prisma.product.count({
        where,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: products,
      pagination: {
        page,
        limit,
        total,
        totalPages: total > 0 ? Math.ceil(total / limit) : 0,
      },
    });
  } catch (error) {
    console.error("Failed to fetch products:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to load products",
      },
      { status: 500 }
    );
  }
}