import test from "node:test";
import assert from "node:assert/strict";

import { normalizeCategoryName } from "../lib/integrations/category-normalizer";
import { mapShopifyProduct } from "../lib/integrations/shopify/mapper";
import { mapWooCommerceProduct } from "../lib/integrations/woocommerce/mapper";
import { importProducts } from "../lib/sync/import-service";
import { prisma } from "../lib/prisma";

test("Shopify mapper normalizes product data", () => {
  const product = mapShopifyProduct({
    id: "gid://shopify/Product/123",
    title: "Test Product",
    description: "A test product description",
    handle: "test-product",
    status: "ACTIVE",
    onlineStoreUrl: "https://demo-store.example/products/test-product",
    vendor: "Acme",
    productType: "Home Goods",
    tags: ["featured", "sale"],
    variants: [
      {
        id: "gid://shopify/ProductVariant/456",
        sku: "SKU-123",
        price: "99.99",
        inventoryQuantity: 10,
        inventoryPolicy: "DENY",
        displayName: "Default Title",
      },
    ],
    images: {
      nodes: [{ url: "https://cdn.example.com/image.jpg" }],
    },
  });

  assert.equal(product.sourceType, "SHOPIFY");
  assert.equal(product.sourceId, "gid://shopify/Product/123");
  assert.equal(product.name, "Test Product");
  assert.equal(product.category?.name, "Home Goods");
  assert.equal(product.images?.[0], "https://cdn.example.com/image.jpg");
  assert.equal(product.stock, 10);
  assert.equal(product.status, true);
});

test("WooCommerce mapper normalizes product data", () => {
  const product = mapWooCommerceProduct({
    id: 987,
    name: "Woo Product",
    slug: "woo-product",
    permalink: "https://demo-store.example/product/woo-product",
    sku: "WOOC-987",
    description: "Woo description",
    price: "49.00",
    regular_price: "49.00",
    sale_price: "39.00",
    stock_quantity: 8,
    stock_status: "instock",
    status: "publish",
    categories: [{ name: "Kitchen" }],
    images: [{ src: "https://cdn.example.com/woo.jpg" }],
    variations: [
      {
        id: 1001,
        sku: "WOOC-987-RED",
        price: "39.00",
        stock_quantity: 4,
      },
    ],
  });

  assert.equal(product.sourceType, "WOOCOMMERCE");
  assert.equal(product.sourceId, "987");
  assert.equal(product.name, "Woo Product");
  assert.equal(product.category?.name, "Kitchen");
  assert.equal(product.price, 39);
  assert.equal(product.stock, 8);
  assert.equal(product.status, true);
  assert.equal(product.variants?.[0]?.sku, "WOOC-987-RED");
});

test("category names are normalized safely", () => {
  assert.equal(normalizeCategoryName("  Home / Living  "), "Home / Living");
  assert.equal(normalizeCategoryName("Kitchen & Dining"), "Kitchen & Dining");
});

test("import service upserts products and tracks sync counters", async () => {
  const sourceId = `test-import-${Date.now()}`;

  const first = await importProducts({
    sourceType: "SHOPIFY",
    products: [
      {
        sourceType: "SHOPIFY",
        sourceId,
        sourceUrl: "https://example.com/products/test-import",
        name: "Test Import Product",
        sku: "TEST-001",
        description: "Initial description",
        price: 100,
        stock: 5,
        status: true,
        images: ["https://cdn.example.com/test.jpg"],
        variants: [],
        metadata: { test: true },
        category: { name: "Test Category" },
      },
    ],
  });

  assert.equal(first.created, 1);
  assert.equal(first.updated, 0);
  assert.equal(first.failed, 0);

  const second = await importProducts({
    sourceType: "SHOPIFY",
    products: [
      {
        sourceType: "SHOPIFY",
        sourceId,
        sourceUrl: "https://example.com/products/test-import",
        name: "Test Import Product",
        sku: "TEST-001",
        description: "Updated description",
        price: 150,
        stock: 3,
        status: true,
        images: ["https://cdn.example.com/test.jpg"],
        variants: [],
        metadata: { test: true },
        category: { name: "Test Category" },
      },
    ],
  });

  assert.equal(second.created, 0);
  assert.equal(second.updated, 1);
  assert.equal(second.failed, 0);

  const saved = await prisma.product.findUnique({
    where: {
      sourceType_sourceId: {
        sourceType: "SHOPIFY",
        sourceId,
      },
    },
    select: {
      description: true,
      price: true,
    },
  });

  assert.equal(saved?.description, "Updated description");
  assert.equal(Number(saved?.price ?? 0), 150);
});
