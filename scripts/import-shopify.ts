import "dotenv/config";

import { fetchAllShopifyProducts, getShopifyConfig } from "../lib/integrations/shopify/client";
import { mapShopifyProduct } from "../lib/integrations/shopify/mapper";
import { importProducts } from "../lib/sync/import-service";

async function main() {
  const dryRun = process.env.DRY_RUN === "true";

  const config = getShopifyConfig();
  console.log(`Shopify import started for ${config.storeDomain}. Dry run: ${dryRun ? "enabled" : "disabled"}`);

  const products = await fetchAllShopifyProducts();
  const normalized = products.map(mapShopifyProduct);

  if (dryRun) {
    console.log(`Fetched: ${normalized.length}`);
    console.log("Dry run enabled; no database changes were made.");
    return;
  }

  const summary = await importProducts({
    sourceType: "SHOPIFY",
    products: normalized,
  });

  console.log("Shopify import completed.");
  console.log(`Fetched: ${normalized.length}`);
  console.log(`Created: ${summary.created}`);
  console.log(`Updated: ${summary.updated}`);
  console.log(`Failed: ${summary.failed}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown Shopify import failure";
  console.error("Shopify import failed:", message);
  process.exit(1);
});
