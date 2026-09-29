import { createCategorySlug, normalizeCategoryName } from "../category-normalizer";
import type { NormalizedProduct, ProductVariantInput } from "../types";
import type { WooCommerceProduct } from "./client";

function parseNumeric(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

export function mapWooCommerceProduct(product: WooCommerceProduct): NormalizedProduct {
  const categoryName = normalizeCategoryName(product.categories?.[0]?.name) ?? normalizeCategoryName(product.type ?? null);
  const priceValue = parseNumeric(product.sale_price ?? product.price ?? product.regular_price);
  const rawStock = typeof product.stock_quantity === "number" ? product.stock_quantity : null;
  const isPublished = product.status === "publish" || product.status === "private";

  const variants: ProductVariantInput[] = (product.variations ?? []).map((variation) => ({
    id: variation.id ? String(variation.id) : undefined,
    sku: variation.sku ?? null,
    price: parseNumeric(variation.price ?? product.sale_price ?? product.price ?? product.regular_price),
    stock: typeof variation.stock_quantity === "number" ? variation.stock_quantity : rawStock,
  }));

  return {
    sourceType: "WOOCOMMERCE",
    sourceId: String(product.id),
    sourceUrl: product.permalink ?? null,
    name: product.name?.trim() || "Untitled product",
    sku: product.sku ?? null,
    description: product.description?.trim() || null,
    price: priceValue,
    stock: rawStock ?? null,
    status: isPublished,
    images: (product.images ?? []).map((image) => image.src).filter((image): image is string => Boolean(image)),
    variants,
    metadata: {
      slug: product.slug ?? null,
      stockStatus: product.stock_status ?? null,
      status: product.status ?? null,
      categories: product.categories ?? [],
    },
    category: categoryName
      ? {
          name: categoryName,
          slug: createCategorySlug(categoryName),
        }
      : null,
  };
}
