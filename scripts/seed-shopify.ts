import "dotenv/config";

import { fetchAllShopifyProducts, getShopifyConfig, shopifyRequest } from "../lib/integrations/shopify/client";

type UserError = { field?: string[] | null; message: string };
type ScopeResponse = { appInstallation: { accessScopes: Array<{ handle: string }> } };
type ExistingProduct = { id: string; title: string; variants?: { nodes?: Array<{ id: string; sku?: string | null }> | null } | null };
type CreateProductResponse = { productCreate: { product?: { id: string; variants?: { nodes?: Array<{ id: string }> | null } | null } | null; userErrors: UserError[] } };
type UpdateVariantResponse = { productVariantsBulkUpdate: { productVariants?: Array<{ id: string }>; userErrors: UserError[] } };

const productCount = 60;

function demoProduct(index: number) {
  const number = String(index).padStart(3, "0");
  const categories = ["Electronics", "Home & Kitchen", "Fashion", "Beauty", "Sports", "Books", "Groceries", "Accessories"];
  const category = categories[(index - 1) % categories.length];

  return {
    sku: `QS-SHOP-${number}`,
    title: `Quick Shelf ${category} Demo ${number}`,
    descriptionHtml: `<p>A dependable ${category.toLowerCase()} product prepared for the Quick Shelf demo catalog.</p>`,
    productType: category,
    vendor: "Quick Shelf Demo",
    tags: ["quick-shelf-demo", "seeded", category.toLowerCase().replace(/[^a-z0-9]+/g, "-")],
    price: (14.99 + index * 2.75).toFixed(2),
    inventory: 12 + (index % 39),
    image: `https://placehold.co/900x900/png?text=QS+SHOP+${number}`,
  };
}

function formatErrors(errors: UserError[]) {
  return errors.map((error) => error.message).join("; ");
}

async function verifyWriteScope() {
  const response = await shopifyRequest<ScopeResponse>("query SeedScopes { appInstallation { accessScopes { handle } } }");
  const scopes = response.appInstallation?.accessScopes?.map((scope) => scope.handle) ?? [];

  if (!scopes.includes("write_products")) {
    throw new Error("Shopify app is missing write_products. Update the app version in the Shopify Dev Dashboard, grant write_products, and reinstall the app on the store.");
  }
}

async function updateDefaultVariant(productId: string, variantId: string, product: ReturnType<typeof demoProduct>) {
  const updateResponse = await shopifyRequest<UpdateVariantResponse>(
    `mutation SeedVariant($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkUpdate(productId: $productId, variants: $variants) {
        productVariants { id }
        userErrors { field message }
      }
    }`,
    { productId, variants: [{ id: variantId, price: product.price, inventoryItem: { sku: product.sku } }] }
  );
  const updateErrors = updateResponse.productVariantsBulkUpdate.userErrors ?? [];
  if (updateErrors.length > 0) throw new Error(formatErrors(updateErrors));
}

async function createProduct(product: ReturnType<typeof demoProduct>) {
  const createResponse = await shopifyRequest<CreateProductResponse>(
    `mutation SeedProduct($product: ProductCreateInput!, $media: [CreateMediaInput!]) {
      productCreate(product: $product, media: $media) {
        product { id variants(first: 1) { nodes { id } } }
        userErrors { field message }
      }
    }`,
    {
      product: {
        title: product.title,
        descriptionHtml: product.descriptionHtml,
        productType: product.productType,
        vendor: product.vendor,
        tags: product.tags,
        status: "ACTIVE",
      },
      media: [{ originalSource: product.image, mediaContentType: "IMAGE" }],
    }
  );

  const createErrors = createResponse.productCreate.userErrors ?? [];
  if (createErrors.length > 0 || !createResponse.productCreate.product?.id) {
    throw new Error(formatErrors(createErrors) || "Shopify did not return a created product.");
  }

  const productId = createResponse.productCreate.product.id;
  const variantId = createResponse.productCreate.product.variants?.nodes?.[0]?.id;
  if (!variantId) throw new Error("Shopify did not return the created default variant.");
  await updateDefaultVariant(productId, variantId, product);
}

async function main() {
  const config = getShopifyConfig();
  console.log(`Shopify seed target: ${config.storeDomain}`);
  await verifyWriteScope();

  const existingProducts = await fetchAllShopifyProducts() as ExistingProduct[];
  const existingSkus = new Set(existingProducts.flatMap((product) => product.variants?.nodes?.map((variant) => variant.sku).filter((sku): sku is string => Boolean(sku)) ?? []));
  const existingByTitle = new Map(existingProducts.map((product) => [product.title, product]));

  let existing = 0;
  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (let index = 1; index <= productCount; index += 1) {
    const product = demoProduct(index);
    if (existingSkus.has(product.sku)) {
      existing += 1;
      skipped += 1;
      continue;
    }

    try {
      const partialProduct = existingByTitle.get(product.title);
      const existingVariantId = partialProduct?.variants?.nodes?.[0]?.id;
      if (partialProduct && existingVariantId) {
        await updateDefaultVariant(partialProduct.id, existingVariantId, product);
        existing += 1;
        skipped += 1;
        continue;
      }
      await createProduct(product);
      created += 1;
    } catch (error) {
      failed += 1;
      console.error(`Shopify product ${product.sku} failed:`, error instanceof Error ? error.message : "Unknown error");
    }
  }

  console.log(`Existing: ${existing}`);
  console.log(`Created: ${created}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total: ${existing + created + failed}`);

  if (failed > 0) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error("Shopify seed failed:", error instanceof Error ? error.message : "Unknown error");
  process.exitCode = 1;
});