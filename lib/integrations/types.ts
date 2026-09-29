export type SourceType = "SHOPIFY" | "WOOCOMMERCE";

export type ProductVariantInput = {
  id?: string;
  sku?: string | null;
  price?: number | null;
  stock?: number | null;
  optionValues?: Record<string, string> | null;
};

export type ProductCategoryInput = {
  name?: string | null;
  slug?: string | null;
  parentName?: string | null;
  parentSlug?: string | null;
};

export type NormalizedProduct = {
  sourceType: SourceType;
  sourceId: string;
  sourceUrl?: string | null;
  name: string;
  sku?: string | null;
  description?: string | null;
  price?: number | null;
  stock?: number | null;
  status: boolean;
  images?: string[] | null;
  variants?: ProductVariantInput[] | null;
  metadata?: Record<string, unknown> | null;
  category?: ProductCategoryInput | null;
};
