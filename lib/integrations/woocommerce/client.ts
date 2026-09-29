export type WooCommerceProduct = {
  id: number;
  type?: string;
  name?: string;
  slug?: string;
  permalink?: string;
  sku?: string | null;
  description?: string;
  price?: string;
  regular_price?: string;
  sale_price?: string;
  stock_quantity?: number | null;
  stock_status?: string;
  status?: string;
  categories?: Array<{ id?: number; name?: string; slug?: string }>;
  images?: Array<{ src?: string | null; alt?: string | null }>;
  variations?: Array<{
    id?: number;
    sku?: string | null;
    price?: string;
    stock_quantity?: number | null;
  }>;
};

export function getWooCommerceConfig() {
  const storeUrl = process.env.WOOCOMMERCE_STORE_URL?.trim();
  const consumerKey = process.env.WOOCOMMERCE_CONSUMER_KEY?.trim();
  const consumerSecret = process.env.WOOCOMMERCE_CONSUMER_SECRET?.trim();

  if (!storeUrl || !consumerKey || !consumerSecret) {
    throw new Error(
      "WooCommerce integration requires WOOCOMMERCE_STORE_URL, WOOCOMMERCE_CONSUMER_KEY, and WOOCOMMERCE_CONSUMER_SECRET."
    );
  }

  return {
    storeUrl: storeUrl.replace(/\/$/, ""),
    consumerKey,
    consumerSecret,
  };
}

export async function fetchWooCommerceProducts(): Promise<WooCommerceProduct[]> {
  const { storeUrl, consumerKey, consumerSecret } = getWooCommerceConfig();
  const endpoint = `${storeUrl}/wp-json/wc/v3/products`;
  const allProducts: WooCommerceProduct[] = [];
  let page = 1;

  while (true) {
    const url = new URL(endpoint);
    url.searchParams.set("per_page", "100");
    url.searchParams.set("page", String(page));
    url.searchParams.set("status", "publish");

    const credentials = `${consumerKey}:${consumerSecret}`;
    const authHeader = `Basic ${Buffer.from(credentials).toString("base64")}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: authHeader,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`WooCommerce request failed (${response.status}): ${text.slice(0, 250)}`);
    }

    const payload = (await response.json()) as WooCommerceProduct[];

    if (!Array.isArray(payload) || payload.length === 0) {
      break;
    }

    allProducts.push(...payload);

    if (payload.length < 100) {
      break;
    }

    page += 1;
  }

  return allProducts;
}
