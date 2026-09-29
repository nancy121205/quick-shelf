import { createCategorySlug, normalizeCategoryName } from "../category-normalizer";
import type { NormalizedProduct, ProductVariantInput } from "../types";
import type { ShopifyProductEdge } from "./client";

export type ShopifyProductInput = Partial<ShopifyProductEdge["node"]> & {
  id?: string | number;
  title?: string | null;
  description?: string | null;
  handle?: string | null;
  status?: string | null;
  onlineStoreUrl?: string | null;
  productType?: string | null;
  vendor?: string | null;
  tags?: string[] | null;
  totalInventory?: number | null;
  variants?:
    | Array<{
        id?: string;
        sku?: string | null;
        price?: string | null;
        inventoryQuantity?: number | null;
        inventoryPolicy?: string | null;
        displayName?: string | null;
        selectedOptions?: Array<{ name: string; value: string }> | null;
      }>
    | { nodes?: Array<{
        id?: string;
        sku?: string | null;
        price?: string | null;
        inventoryQuantity?: number | null;
        title?: string | null;
        inventoryPolicy?: string | null;
        displayName?: string | null;
        selectedOptions?: Array<{ name: string; value: string }> | null;
      }> | null }
    | null;
  images?:
    | Array<{ url?: string | null }>
    | { nodes?: Array<{ url?: string | null; altText?: string | null }> | null }
    | null;
};

function parseNumeric(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function toVariantList(variants?: ShopifyProductEdge["node"]["variants"] | Array<{ id?: string; sku?: string | null; price?: string | null; inventoryQuantity?: number | null; selectedOptions?: Array<{ name: string; value: string }> | null }>): ProductVariantInput[] {
  const nodes = Array.isArray(variants) ? variants : variants?.nodes ?? [];

  if (nodes.length === 0) {
    return [];
  }

  return nodes.map((variant) => {
    const optionValues = variant.selectedOptions?.reduce<Record<string, string>>((accumulator, option) => {
      if (option?.name && option?.value) {
        accumulator[option.name] = option.value;
      }
      return accumulator;
    }, {}) ?? {};

    return {
      id: variant.id,
      sku: variant.sku ?? null,
      price: parseNumeric(variant.price),
      stock: typeof variant.inventoryQuantity === "number" ? variant.inventoryQuantity : null,
      optionValues: Object.keys(optionValues).length > 0 ? optionValues : null,
    };
  });
}

export function mapShopifyProduct(product: ShopifyProductInput): NormalizedProduct {
  const variantList = toVariantList(product.variants);
  const primaryVariant = variantList[0];
  const categoryName = normalizeCategoryName(product.productType ?? null) ?? normalizeCategoryName(product.vendor ?? null);
  const productName = normalizeCategoryName(product.title ?? null) ?? product.handle ?? "Untitled product";

  const totalStock = typeof product.totalInventory === "number"
    ? product.totalInventory
    : variantList.reduce((sum, variant) => sum + (variant.stock ?? 0), 0);

  const productStatus = product.status?.toUpperCase() === "ACTIVE" || product.status === "ACTIVE";
  const imageNodes = Array.isArray(product.images) ? product.images : (product.images?.nodes ?? []);

  return {
    sourceType: "SHOPIFY",
    sourceId: String(product.id),
    sourceUrl: product.onlineStoreUrl ?? null,
    name: productName,
    sku: primaryVariant?.sku ?? null,
    description: product.description?.trim() || null,
    price: parseNumeric(primaryVariant?.price ?? null) ?? null,
    stock: totalStock > 0 ? totalStock : null,
    status: productStatus,
    images: imageNodes
      .map((image) => ("url" in image ? image.url : undefined))
      .filter((image): image is string => Boolean(image)),
    variants: variantList,
    metadata: {
      vendor: product.vendor ?? null,
      productType: product.productType ?? null,
      tags: product.tags ?? [],
      handle: product.handle ?? null,
      status: product.status ?? null,
    },
    category: categoryName
      ? {
          name: categoryName,
          slug: createCategorySlug(categoryName),
        }
      : null,
  };
}
