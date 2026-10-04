export type ShopifyProductEdge = {
  node: {
    id: string;
    title: string;
    description?: string | null;
    handle: string;
    status?: string | null;
    onlineStoreUrl?: string | null;
    productType?: string | null;
    vendor?: string | null;
    tags?: string[] | null;
    totalInventory?: number | null;
    variants?: {
      nodes?: Array<{
        id: string;
        sku?: string | null;
        price?: string | null;
        inventoryQuantity?: number | null;
        title?: string | null;
        selectedOptions?: Array<{ name: string; value: string }> | null;
      }> | null;
    } | null;
    images?: {
      nodes?: Array<{ url?: string | null; altText?: string | null }> | null;
    } | null;
  };
};

export type ShopifyProductsResponse = {
  products: {
    edges?: ShopifyProductEdge[] | null;
    pageInfo?: {
      hasNextPage?: boolean;
      endCursor?: string | null;
    } | null;
  };
};

type ShopifyTokenResponse = {
  access_token?: string;
  expires_in?: number;
};

let cachedToken: { value: string; expiresAt: number } | null = null;

function isPlaceholder(value: string) {
  const normalized = value.trim().toLowerCase();
  return normalized.length === 0 || normalized.includes("your_") || normalized.includes("replace_with") || normalized.includes("example.com") || normalized.includes("your-store");
}

function normalizeStoreDomain(value: string) {
  const normalized = value.trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "").toLowerCase();

  if (isPlaceholder(normalized) || normalized.includes("/") || normalized.includes("://")) {
    throw new Error("SHOPIFY_STORE_DOMAIN must be a real Shopify store hostname such as store.myshopify.com.");
  }

  try {
    const url = new URL(`https://${normalized}`);
    if (url.hostname !== normalized || !url.hostname.includes(".")) throw new Error("invalid hostname");
  } catch {
    throw new Error("SHOPIFY_STORE_DOMAIN must be a valid store hostname without a path.");
  }

  return normalized;
}

function validateStoreDomain(value: string) {
  if (isPlaceholder(value) || value.includes("/") || value.includes("://")) {
    throw new Error("SHOPIFY_STORE_DOMAIN must be a real Shopify store hostname such as store.myshopify.com.");
  }

  try {
    const url = new URL(`https://${value}`);
    if (url.hostname !== value || !url.hostname.includes(".")) {
      throw new Error("invalid hostname");
    }
  } catch {
    throw new Error("SHOPIFY_STORE_DOMAIN must be a valid store hostname without a protocol or path.");
  }
}

function validateCredential(value: string, name: string) {
  if (isPlaceholder(value)) {
    throw new Error(`${name} is missing or still contains a placeholder value.`);
  }
}

export function getShopifyConfig() {
  const configuredDomain = process.env.SHOPIFY_STORE_DOMAIN?.trim();
  const clientId = process.env.SHOPIFY_CLIENT_ID?.trim();
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET?.trim();
  const apiVersion = process.env.SHOPIFY_API_VERSION?.trim() || "2025-01";

  if (!configuredDomain) {
    throw new Error("Shopify integration requires SHOPIFY_STORE_DOMAIN.");
  }
  const storeDomain = normalizeStoreDomain(configuredDomain);
  validateStoreDomain(storeDomain);
  if (!clientId) throw new Error("Shopify integration requires SHOPIFY_CLIENT_ID.");
  if (!clientSecret) throw new Error("Shopify integration requires SHOPIFY_CLIENT_SECRET.");
  validateCredential(clientId, "SHOPIFY_CLIENT_ID");
  validateCredential(clientSecret, "SHOPIFY_CLIENT_SECRET");
  if (!/^\d{4}-\d{2}$/.test(apiVersion) || apiVersion.includes("your")) {
    throw new Error("SHOPIFY_API_VERSION must use the YYYY-MM format.");
  }

  return {
    storeDomain,
    clientId,
    clientSecret,
    apiVersion,
    endpoint: `https://${storeDomain}/admin/api/${apiVersion}/graphql.json`,
    tokenEndpoint: `https://${storeDomain}/admin/oauth/access_token`,
  };
}

async function requestWithTimeout(url: string, init: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Shopify request timed out after 15 seconds.");
    }
    throw new Error("Unable to reach Shopify. Check the store domain and network connection.");
  } finally {
    clearTimeout(timeout);
  }
}

async function acquireShopifyAccessToken(forceRefresh = false) {
  const config = getShopifyConfig();
  if (!forceRefresh && cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.value;
  }

  const response = await requestWithTimeout(config.tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ client_id: config.clientId, client_secret: config.clientSecret, grant_type: "client_credentials" }),
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("Shopify authentication failed. Verify the Dev Dashboard client credentials and app permissions.");
    }
    let detail = "";
    try {
      const payload = (await response.json()) as { error?: string; error_description?: string };
      detail = payload.error_description ?? payload.error ?? "";
    } catch {
      detail = "";
    }
    const lowerDetail = detail.toLowerCase();
    if (lowerDetail.includes("not installed") || lowerDetail.includes("organization") || lowerDetail.includes("same shop")) {
      throw new Error("Shopify client-credentials authentication is not permitted for this store. Confirm that the app is installed and that the app and dev store are in the same Shopify organization in the Dev Dashboard.");
    }
    throw new Error(`Shopify authentication failed with HTTP ${response.status}${detail ? `: ${detail}` : "."}`);
  }

  const payload = (await response.json()) as ShopifyTokenResponse;
  if (!payload.access_token) {
    throw new Error("Shopify authentication succeeded but no access token was returned. Check the app configuration.");
  }

  const expiresIn = typeof payload.expires_in === "number" ? payload.expires_in : 86_400;
  cachedToken = { value: payload.access_token, expiresAt: Date.now() + Math.max(expiresIn - 60, 60) * 1000 };
  return payload.access_token;
}

export async function shopifyRequest<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const { endpoint } = getShopifyConfig();

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const accessToken = await acquireShopifyAccessToken(attempt === 1);
    const response = await requestWithTimeout(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": accessToken, Accept: "application/json" },
      body: JSON.stringify({ query, variables }),
    });

    if (response.status === 401 || response.status === 403) {
      cachedToken = null;
      if (attempt === 0) continue;
      throw new Error("Shopify rejected the Admin API request. Verify app permissions include read access to products.");
    }

    if (!response.ok) {
      if (response.status === 429) throw new Error("Shopify rate limited the request. Wait briefly and retry.");
      throw new Error(`Shopify Admin API request failed with HTTP ${response.status}.`);
    }

    const payload = (await response.json()) as { data?: T; errors?: Array<{ message?: string }> };

    if (payload.errors && payload.errors.length > 0) {
      const details = payload.errors.map((error) => error.message ?? "Unknown GraphQL error").join(", ");
      throw new Error(`Shopify GraphQL error: ${details}`);
    }

    if (!payload.data) throw new Error("Shopify response did not include data.");
    return payload.data;
  }

  throw new Error("Shopify request failed after authentication refresh.");
}

export async function checkShopifyConnection() {
  const response = await shopifyRequest<{ shop: { name: string } }>("query CheckShop { shop { name } }");
  return response.shop.name;
}

export async function fetchAllShopifyProducts(): Promise<ShopifyProductEdge["node"][]> {
  const pageSize = 50;
  const products: ShopifyProductEdge["node"][] = [];
  let after: string | null = null;

  while (true) {
    const query = `
      query GetProducts($first: Int!, $after: String) {
        products(first: $first, after: $after) {
          edges {
            node {
              id
              title
              description
              handle
              status
              onlineStoreUrl
              productType
              vendor
              tags
              totalInventory
              variants(first: 10) {
                nodes {
                  id
                  sku
                  price
                  inventoryQuantity
                  title
                  selectedOptions {
                    name
                    value
                  }
                }
              }
              images(first: 10) {
                nodes {
                  url
                  altText
                }
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `;

    const response: ShopifyProductsResponse = await shopifyRequest<ShopifyProductsResponse>(query, {
      first: pageSize,
      after,
    });

    const edges = response.products.edges ?? [];

    for (const edge of edges) {
      products.push(edge.node);
    }

    const pageInfo: NonNullable<ShopifyProductsResponse["products"]["pageInfo"]> = response.products.pageInfo ?? {};
    if (!pageInfo.hasNextPage || !pageInfo.endCursor) {
      break;
    }

    after = pageInfo.endCursor;
  }

  return products;
}
