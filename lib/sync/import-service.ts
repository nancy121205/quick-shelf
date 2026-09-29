import { Prisma } from "../../app/generated/prisma/client";
import { prisma } from "../prisma";
import { createCategorySlug, normalizeCategoryName } from "../integrations/category-normalizer";
import type { NormalizedProduct, SourceType } from "../integrations/types";

export type ImportProductsArgs = {
  sourceType: SourceType;
  products: NormalizedProduct[];
};

export type ImportProductsSummary = {
  created: number;
  updated: number;
  failed: number;
  syncLogId: string;
};

async function ensureCategoryForProduct(product: NormalizedProduct) {
  const categoryName = normalizeCategoryName(product.category?.name ?? null);

  if (!categoryName) {
    return null;
  }

  const slug = createCategorySlug(categoryName);

  const category = await prisma.category.upsert({
    where: { slug },
    update: {
      name: categoryName,
      visible: true,
    },
    create: {
      name: categoryName,
      slug,
      visible: true,
      sortOrder: 0,
    },
  });

  return category;
}

export async function importProducts({
  sourceType,
  products,
}: ImportProductsArgs): Promise<ImportProductsSummary> {
  const syncLog = await prisma.syncLog.create({
    data: {
      sourceType,
      status: "RUNNING",
      startedAt: new Date(),
      productsCreated: 0,
      productsUpdated: 0,
      productsFailed: 0,
      errors: [],
    },
  });

  let created = 0;
  let updated = 0;
  let failed = 0;
  const errors: Array<{ sourceId: string; message: string }> = [];

  for (const product of products) {
    try {
      const key = {
        sourceType,
        sourceId: product.sourceId,
      };

      const existing = await prisma.product.findUnique({
        where: {
          sourceType_sourceId: key,
        },
        select: { id: true },
      });

      const category = await ensureCategoryForProduct(product);
      const payload = {
        sourceType,
        sourceId: product.sourceId,
        sourceUrl: product.sourceUrl ?? null,
        name: product.name,
        sku: product.sku ?? null,
        description: product.description ?? null,
        price: product.price ?? null,
        stock: product.stock ?? null,
        status: product.status,
        images: product.images ?? [],
        variants: product.variants ?? [],
        metadata: (product.metadata ?? {}) as Prisma.InputJsonValue,
        categoryId: category?.id ?? null,
        lastSyncedAt: new Date(),
      };

      if (existing) {
        await prisma.product.update({
          where: {
            sourceType_sourceId: key,
          },
          data: payload,
        });
        updated += 1;
      } else {
        await prisma.product.create({
          data: payload,
        });
        created += 1;
      }
    } catch (error) {
      failed += 1;
      errors.push({
        sourceId: product.sourceId,
        message: error instanceof Error ? error.message : "Unknown import failure",
      });
    }
  }

  const finalStatus = failed > 0 ? (created > 0 || updated > 0 ? "PARTIAL" : "FAILED") : "SUCCESS";

  await prisma.syncLog.update({
    where: { id: syncLog.id },
    data: {
      finishedAt: new Date(),
      status: finalStatus,
      productsCreated: created,
      productsUpdated: updated,
      productsFailed: failed,
      errors,
    },
  });

  return {
    created,
    updated,
    failed,
    syncLogId: syncLog.id,
  };
}
