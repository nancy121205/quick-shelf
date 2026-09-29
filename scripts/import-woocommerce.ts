import "dotenv/config";

import { fetchWooCommerceProducts, getWooCommerceConfig } from "../lib/integrations/woocommerce/client";
import { mapWooCommerceProduct } from "../lib/integrations/woocommerce/mapper";
import { importProducts } from "../lib/sync/import-service";

async function main() {
  const dryRun = process.env.DRY_RUN === "true";

  const config = getWooCommerceConfig();
  console.log(`WooCommerce import started for ${config.storeUrl}. Dry run: ${dryRun ? "enabled" : "disabled"}`);

  const products = await fetchWooCommerceProducts();
  const normalized = products.map(mapWooCommerceProduct);

  if (dryRun) {
    console.log(`Fetched: ${normalized.length}`);
    console.log("Dry run enabled; no database changes were made.");
    return;
  }

  const summary = await importProducts({
    sourceType: "WOOCOMMERCE",
    products: normalized,
  });

  console.log("WooCommerce import completed.");
  console.log(`Fetched: ${normalized.length}`);
  console.log(`Created: ${summary.created}`);
  console.log(`Updated: ${summary.updated}`);
  console.log(`Failed: ${summary.failed}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown WooCommerce import failure";
  console.error("WooCommerce import failed:", message);
  process.exit(1);
});
