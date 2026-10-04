import "dotenv/config";

import { fetchAllShopifyProducts, getShopifyConfig, shopifyRequest } from "../lib/integrations/shopify/client";

type UserError = { field?: string[] | null; message: string };
type ScopeResponse = { appInstallation: { accessScopes: Array<{ handle: string }> } };
type LocationResponse = { locations: { nodes: Array<{ id: string }> } };
type CreateProductResponse = { productCreate: { product?: { id: string } | null; userErrors: UserError[] } };
type CreateVariantResponse = { productVariantsBulkCreate: { productVariants?: Array<{ id: string; inventoryItem?: { id: string } | null }>; userErrors: UserError[] } };
type InventoryResponse = { inventorySetQuantities: { userErrors: UserError[] } };

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

async function createProduct(product: ReturnType<typeof demoProduct>, locationId: string | null) {
  const createResponse = await shopifyRequest<CreateProductResponse>(
    `mutation SeedProduct($product: ProductCreateInput!, $media: [CreateMediaInput!]) {
      productCreate(product: $product, media: $media) {
        product { id }
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
  const variantResponse = await shopifyRequest<CreateVariantResponse>(
    `mutation SeedVariant($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkCreate(productId: $productId, variants: $variants) {
        productVariants { id inventoryItem { id } }
        userErrors { field message }
      }
    }`,
    {
      productId,
      variants: [{ price: product.price, sku: product.sku, ...(locationId ? { inventoryQuantities: [{ availableQuantity: product.inventory, locationId }] } : {}) }],
    }
  );

  const variantErrors = variantResponse.productVariantsBulkCreate.userErrors ?? [];
  if (variantErrors.length > 0) throw new Error(formatErrors(variantErrors));

  const inventoryItemId = variantResponse.productVariantsBulkCreate.productVariants?.[0]?.inventoryItem?.id;
  if (locationId && inventoryItemId && !variantResponse.productVariantsBulkCreate.productVariants?.[0]) {
    const inventoryResponse = await shopifyRequest<InventoryResponse>(
      `mutation SeedInventory($input: InventorySetQuantitiesInput!) {
        inventorySetQuantities(input: $input) { userErrors { field message } }
      }`,
      { input: { name: "available", reason: "correction", quantities: [{ inventoryItemId, locationId, quantity: product.inventory }] } }
    );
    if (inventoryResponse.inventorySetQuantities.userErrors.length > 0) throw new Error(formatErrors(inventoryResponse.inventorySetQuantities.userErrors));
  }
}

async function main() {
  const config = getShopifyConfig();
  console.log(`Shopify seed target: ${config.storeDomain}`);
  await verifyWriteScope();

  const existingProducts = await fetchAllShopifyProducts();
  const existingSkus = new Set(existingProducts.flatMap((product) => product.variants?.nodes?.map((variant) => variant.sku).filter((sku): sku is string => Boolean(sku)) ?? []));
  const locationResponse = await shopifyRequest<LocationResponse>("query SeedLocation { locations(first: 1) { nodes { id } } }");
  const locationId = locationResponse.locations.nodes[0]?.id ?? null;

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
      await createProduct(product, locationId);
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