import https from "node:https";

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

function isPlaceholder(value: string) {
  const normalized = value.trim().toLowerCase();
  return normalized.length === 0 || normalized.includes("your_") || normalized.includes("replace_with") || normalized.includes("your-store") || normalized === "https://example.com";
}

function validateSecret(value: string, name: string) {
  if (isPlaceholder(value)) throw new Error(`${name} is missing or still contains a placeholder value.`);
}

function isLocalWordPressStudio(url: URL) {
  return process.env.NODE_ENV !== "production" && url.protocol === "https:" && (url.hostname === "wp.local" || url.hostname.endsWith(".wp.local"));
}

export function requestWooCommerce(url: URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers);

  if (!isLocalWordPressStudio(url)) {
    return fetch(url, { ...init, headers, method: init.method ?? "GET", signal: AbortSignal.timeout(15_000) });
  }

  return new Promise<Response>((resolve, reject) => {
    const request = https.request(url, { method: init.method ?? "GET", headers: Object.fromEntries(headers.entries()), rejectUnauthorized: false }, (response) => {
      const chunks: Buffer[] = [];
      response.on("data", (chunk: Buffer) => chunks.push(chunk));
      response.on("end", () => {
        const responseHeaders = new Headers();
        for (const [name, value] of Object.entries(response.headers)) {
          if (typeof value === "string") responseHeaders.set(name, value);
          else if (Array.isArray(value)) responseHeaders.set(name, value.join(", "));
        }
        resolve(new Response(Buffer.concat(chunks), { status: response.statusCode ?? 500, headers: responseHeaders }));
      });
    });

    request.setTimeout(15_000, () => request.destroy(new Error("WooCommerce request timed out after 15 seconds.")));
    request.on("error", reject);
    if (typeof init.body === "string") request.write(init.body);
    request.end();
  });
}

export function getWooCommerceConfig() {
  const storeUrl = process.env.WOOCOMMERCE_STORE_URL?.trim();
  const consumerKey = process.env.WOOCOMMERCE_CONSUMER_KEY?.trim();
  const consumerSecret = process.env.WOOCOMMERCE_CONSUMER_SECRET?.trim();

  if (!storeUrl || !consumerKey || !consumerSecret) {
    throw new Error(
      "WooCommerce integration requires WOOCOMMERCE_STORE_URL, WOOCOMMERCE_CONSUMER_KEY, and WOOCOMMERCE_CONSUMER_SECRET."
    );
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(storeUrl);
  } catch {
    throw new Error("WOOCOMMERCE_STORE_URL must be a valid http or https URL.");
  }
  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") throw new Error("WOOCOMMERCE_STORE_URL must use http or https.");
  validateSecret(consumerKey, "WOOCOMMERCE_CONSUMER_KEY");
  validateSecret(consumerSecret, "WOOCOMMERCE_CONSUMER_SECRET");

  return {
    storeUrl: storeUrl.replace(/\/$/, ""),
    consumerKey,
    consumerSecret,
  };
}

export async function fetchWooCommerceProducts(options: { perPage?: number; maxPages?: number } = {}): Promise<WooCommerceProduct[]> {
  const { storeUrl, consumerKey, consumerSecret } = getWooCommerceConfig();
  const endpoint = `${storeUrl}/wp-json/wc/v3/products`;
  const allProducts: WooCommerceProduct[] = [];
  const perPage = Math.min(Math.max(options.perPage ?? 100, 1), 100);
  let page = 1;

  while (true) {
    const url = new URL(endpoint);
    url.searchParams.set("per_page", String(perPage));
    url.searchParams.set("page", String(page));
    url.searchParams.set("status", "publish");

    const credentials = `${consumerKey}:${consumerSecret}`;
    const authHeader = `Basic ${Buffer.from(credentials).toString("base64")}`;

    let response: Response;
    try {
      response = await requestWooCommerce(url, { headers: { Authorization: authHeader, Accept: "application/json" } });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") throw new Error("WooCommerce request timed out after 15 seconds.");
      const detail = error instanceof Error ? error.message : "Unknown request error";
      if (process.env.NODE_ENV !== "production") throw new Error(`Unable to reach WooCommerce: ${detail}`);
      throw new Error("Unable to reach WooCommerce. Check the store URL and network connection.");
    }

    if (!response.ok && (response.status === 401 || response.status === 403)) {
      const fallbackUrl = new URL(url);
      fallbackUrl.searchParams.set("consumer_key", consumerKey);
      fallbackUrl.searchParams.set("consumer_secret", consumerSecret);
      response = await requestWooCommerce(fallbackUrl, { headers: { Accept: "application/json" } });
    }

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        let detail = "";
        try {
          const payload = (await response.json()) as { message?: string; code?: string };
          detail = payload.message ?? payload.code ?? "";
        } catch {
          detail = "";
        }
        throw new Error(`WooCommerce authentication failed${detail ? `: ${detail}` : ". Verify the REST API key permissions."}`);
      }
      if (response.status === 429) throw new Error("WooCommerce rate limited the request. Wait briefly and retry.");
      throw new Error(`WooCommerce request failed with HTTP ${response.status}.`);
    }

    const payload = (await response.json()) as WooCommerceProduct[];

    if (!Array.isArray(payload) || payload.length === 0) {
      break;
    }

    allProducts.push(...payload);

    if (payload.length < perPage || (options.maxPages && page >= options.maxPages)) {
      break;
    }

    page += 1;
  }

  return allProducts;
}

export async function checkWooCommerceConnection() {
  const products = await fetchWooCommerceProducts({ perPage: 1, maxPages: 1 });
  return products.length;
}
