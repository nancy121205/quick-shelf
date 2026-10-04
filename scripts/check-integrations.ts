import "dotenv/config";

import { checkShopifyConnection, getShopifyConfig } from "../lib/integrations/shopify/client";
import { checkWooCommerceConnection, getWooCommerceConfig } from "../lib/integrations/woocommerce/client";

async function main() {
  try {
    const config = getShopifyConfig();
    console.log(`Shopify store: ${config.storeDomain}`);
    console.log("Shopify client ID configured: yes");
    console.log("Shopify client secret configured: yes");
    const shopName = await checkShopifyConnection();
    console.log(`Shopify token and GraphQL connectivity: OK (${shopName})`);
  } catch (error) {
    console.error("Shopify connectivity: FAILED", error instanceof Error ? error.message : "Unknown error");
    process.exitCode = 1;
  }

  try {
    const config = getWooCommerceConfig();
    console.log(`WooCommerce URL: ${config.storeUrl}`);
    console.log("WooCommerce key configured: yes");
    console.log("WooCommerce secret configured: yes");
    const productCount = await checkWooCommerceConnection();
    console.log(`WooCommerce API connectivity: OK (products in sample page: ${productCount})`);
  } catch (error) {
    console.error("WooCommerce connectivity: FAILED", error instanceof Error ? error.message : "Unknown error");
    process.exitCode = 1;
  }
}

void main();