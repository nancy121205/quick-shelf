import "dotenv/config";

import { getWooCommerceConfig, requestWooCommerce } from "../lib/integrations/woocommerce/client";

type WooCategory = { id: number; name: string; slug: string };
type WooProduct = { id: number; sku?: string | null };

const categories = ["Electronics", "Home & Kitchen", "Fashion", "Beauty", "Sports", "Books", "Groceries", "Accessories"];

function authHeaders() {
  const { consumerKey, consumerSecret } = getWooCommerceConfig();
  return { Authorization: `Basic ${Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64")}`, Accept: "application/json", "Content-Type": "application/json" };
}

async function wooJson<T>(path: string, init: RequestInit = {}) {
  const config = getWooCommerceConfig();
  const url = new URL(`/wp-json/wc/v3/${path.replace(/^\//, "")}`, config.storeUrl);
  const headers = { ...authHeaders(), ...(init.headers as Record<string, string> | undefined) };
  let response = await requestWooCommerce(url, { ...init, headers });

  if (!response.ok && (response.status === 401 || response.status === 403)) {
    const fallbackUrl = new URL(url);
    fallbackUrl.searchParams.set("consumer_key", config.consumerKey);
    fallbackUrl.searchParams.set("consumer_secret", config.consumerSecret);
    const fallbackHeaders = Object.fromEntries(Object.entries(headers).filter(([name]) => name.toLowerCase() !== "authorization"));
    response = await requestWooCommerce(fallbackUrl, { ...init, headers: fallbackHeaders });
  }

  if (!response.ok) {
    let detail = "";
    try { const payload = await response.json() as { message?: string; code?: string }; detail = payload.message ?? payload.code ?? ""; } catch { detail = ""; }
    throw new Error(`WooCommerce API HTTP ${response.status}${detail ? `: ${detail}` : "."}`);
  }

  return await response.json() as T;
}

function demoProduct(index: number, categoryId: number) {
  const number = String(index).padStart(3, "0");
  const category = categories[(index - 1) % categories.length];
  return {
    name: `Quick Shelf ${category} Demo ${number}`,
    sku: `QS-WOO-${number}`,
    type: "simple",
    regular_price: (12.99 + index * 1.85).toFixed(2),
    description: `A dependable ${category.toLowerCase()} product prepared for the Quick Shelf demo catalog.`,
    short_description: `Quick Shelf demo ${category.toLowerCase()} product ${number}.`,
    manage_stock: true,
    stock_quantity: 10 + (index % 41),
    stock_status: "instock",
    status: "publish",
    categories: [{ id: categoryId }],
    tags: [{ name: "quick-shelf-demo" }, { name: "seeded" }, { name: category.toLowerCase().replace(/[^a-z0-9]+/g, "-") }],
  };
}

async function getAllProducts() {
  const products: WooProduct[] = [];
  for (let page = 1; ; page += 1) {
    const batch = await wooJson<WooProduct[]>(`products?per_page=100&page=${page}`);
    if (batch.length === 0) break;
    products.push(...batch);
    if (batch.length < 100) break;
  }
  return products;
}

async function getOrCreateCategory(name: string) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const found = await wooJson<WooCategory[]>(`products/categories?slug=${encodeURIComponent(slug)}&per_page=1`);
  if (found[0]) return found[0];
  return await wooJson<WooCategory>("products/categories", { method: "POST", body: JSON.stringify({ name, slug }) });
}

async function main() {
  const config = getWooCommerceConfig();
  console.log(`WooCommerce seed target: ${config.storeUrl}`);
  const existingProducts = await getAllProducts();
  const existingSkus = new Set(existingProducts.map((product) => product.sku).filter((sku): sku is string => Boolean(sku)));
  const categoryIds = new Map<string, number>();
  for (const category of categories) categoryIds.set(category, (await getOrCreateCategory(category)).id);

  let existing = 0;
  let created = 0;
  let skipped = 0;
  let failed = 0;
  const imageFailures = 0;

  for (let index = 1; index <= 60; index += 1) {
    const category = categories[(index - 1) % categories.length];
    const product = demoProduct(index, categoryIds.get(category) as number);
    if (existingSkus.has(product.sku)) {
      existing += 1;
      skipped += 1;
      continue;
    }
    try {
      await wooJson<WooProduct>("products", { method: "POST", body: JSON.stringify(product) });
      created += 1;
    } catch (error) {
      failed += 1;
      console.error(`WooCommerce product ${product.sku} failed:`, error instanceof Error ? error.message : "Unknown error");
    }
  }

  console.log(`Existing: ${existing}`);
  console.log(`Created: ${created}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Failed: ${failed}`);
  console.log(`Image failures: ${imageFailures}`);
  console.log(`Total: ${existing + created + failed}`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error("WooCommerce seed failed:", error instanceof Error ? error.message : "Unknown error");
  process.exitCode = 1;
});